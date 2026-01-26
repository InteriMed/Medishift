import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    increment,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';

const TOPICS_COLLECTION = 'topics';
const REPLIES_COLLECTION = 'replies';

export const topicService = {
    // Get all categories
    getCategories: () => {
        return [
            'feedback',
            'bug_report',
            'feature_request',
            'support',
            'question',
            'general'
        ];
    },

    // List public topics (community)
    listTopics: async (category, isOpen = true) => {
        try {
            const topicsRef = collection(db, TOPICS_COLLECTION);
            let q = query(
                topicsRef,
                where('is_open', '==', isOpen),
                orderBy('created_at', 'desc')
            );

            if (category) {
                q = query(q, where('category', '==', category));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate()?.toISOString() || new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error listing topics:', error);
            throw error;
        }
    },

    // List user's topics (support/my topics)
    listMyTopics: async (userId) => {
        try {
            if (!userId) return [];
            const topicsRef = collection(db, TOPICS_COLLECTION);
            const q = query(
                topicsRef,
                where('user_id', '==', userId),
                orderBy('created_at', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate()?.toISOString() || new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error listing my topics:', error);
            throw error;
        }
    },

    // Get a single topic with its replies
    getTopic: async (topicId) => {
        try {
            const topicRef = doc(db, TOPICS_COLLECTION, topicId);
            const topicDoc = await getDoc(topicRef);

            if (!topicDoc.exists()) {
                throw new Error('Topic not found');
            }

            // Get replies
            // Note: In a real app we might want to subcollection this if strictly hierarchical, 
            // but for now assuming top-level collection with topic_id reference as per assumed schema
            // or we can store replies in a subcollection. 
            // Based on the reference code, it seems to expect a list of replies.
            // Let's assume replies are a subcollection 'replies' of the topic for better scalability,
            // OR a top level collection queried by topic_id. 
            // The reference code `topicService.createReply(topic.id, ...)` suggests it might be a subcollection or just linked.
            // Let's use a subcollection `topics/{topicId}/replies`.

            const repliesRef = collection(db, TOPICS_COLLECTION, topicId, REPLIES_COLLECTION);
            const repliesQuery = query(repliesRef, orderBy('created_at', 'asc'));
            const repliesSnapshot = await getDocs(repliesQuery);

            const replies = repliesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate()?.toISOString() || new Date().toISOString()
            }));

            return {
                id: topicDoc.id,
                ...topicDoc.data(),
                created_at: topicDoc.data().created_at?.toDate()?.toISOString() || new Date().toISOString(),
                replies
            };
        } catch (error) {
            console.error('Error getting topic:', error);
            throw error;
        }
    },

    // Create a new topic
    createTopic: async (data, user) => {
        try {
            if (!user) throw new Error('User must be logged in');

            const topicData = {
                title: data.title,
                content: data.content,
                category: data.category || 'general',
                is_open: data.is_open ?? true,
                user_id: user.uid,
                user_email: user.email,
                user_username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                created_at: serverTimestamp(),
                upvotes: 0,
                upvoters: [],
                view_count: 0
            };

            const docRef = await addDoc(collection(db, TOPICS_COLLECTION), topicData);
            return { id: docRef.id, ...topicData };
        } catch (error) {
            console.error('Error creating topic:', error);
            throw error;
        }
    },

    // Delete a topic
    deleteTopic: async (topicId) => {
        try {
            await deleteDoc(doc(db, TOPICS_COLLECTION, topicId));
        } catch (error) {
            console.error('Error deleting topic:', error);
            throw error;
        }
    },

    // Upvote a topic
    upvoteTopic: async (topicId, userId) => {
        try {
            if (!userId) throw new Error('User must be logged in');

            const topicRef = doc(db, TOPICS_COLLECTION, topicId);
            const topicDoc = await getDoc(topicRef);

            if (!topicDoc.exists()) throw new Error('Topic not found');

            const data = topicDoc.data();
            const upvoters = data.upvoters || [];

            if (upvoters.includes(userId)) {
                // Remove upvote
                await updateDoc(topicRef, {
                    upvotes: increment(-1),
                    upvoters: arrayRemove(userId)
                });
            } else {
                // Add upvote
                await updateDoc(topicRef, {
                    upvotes: increment(1),
                    upvoters: arrayUnion(userId)
                });
            }
        } catch (error) {
            console.error('Error upvoting topic:', error);
            throw error;
        }
    },

    // Create a reply
    createReply: async (topicId, data, user) => {
        try {
            if (!user) throw new Error('User must be logged in');

            const replyData = {
                content: data.content,
                parent_id: data.parent_id || null,
                user_id: user.uid,
                user_email: user.email,
                user_username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                created_at: serverTimestamp(),
                upvotes: 0,
                upvoters: [],
                is_admin_reply: false // Can add logic for admin check later
            };

            const repliesRef = collection(db, TOPICS_COLLECTION, topicId, REPLIES_COLLECTION);
            const docRef = await addDoc(repliesRef, replyData);

            // Update topic reply count or last activity if needed?
            // For now just add the reply

            return { id: docRef.id, ...replyData };
        } catch (error) {
            console.error('Error creating reply:', error);
            throw error;
        }
    },

    // Upvote a reply
    upvoteReply: async (topicId, replyId, userId) => {
        try {
            if (!userId) throw new Error('User must be logged in');

            const replyRef = doc(db, TOPICS_COLLECTION, topicId, REPLIES_COLLECTION, replyId);
            const replyDoc = await getDoc(replyRef);

            if (!replyDoc.exists()) throw new Error('Reply not found');

            const data = replyDoc.data();
            const upvoters = data.upvoters || [];

            if (upvoters.includes(userId)) {
                await updateDoc(replyRef, {
                    upvotes: increment(-1),
                    upvoters: arrayRemove(userId)
                });
            } else {
                await updateDoc(replyRef, {
                    upvotes: increment(1),
                    upvoters: arrayUnion(userId)
                });
            }
        } catch (error) {
            console.error('Error upvoting reply:', error);
            throw error;
        }
    }
};

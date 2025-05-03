const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Payment service webhook handler
exports.paymentWebhook = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST method
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      
      // Get payload from request
      const payload = req.body;
      
      // Verify webhook signature (implementation varies by payment provider)
      // For example, if using Stripe:
      // const signature = req.headers['stripe-signature'];
      // const event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
      
      functions.logger.info('Payment webhook received', { payload });
      
      // Process based on event type
      if (payload.event_type === 'payment.succeeded') {
        const transactionId = payload.transaction_id;
        const amount = payload.amount;
        
        // Update transaction in Firestore
        await admin.firestore()
          .collection('transactions')
          .doc(transactionId)
          .update({
            status: 'completed',
            processedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        
        // Update related contract if applicable
        if (payload.contract_id) {
          await admin.firestore()
            .collection('contracts')
            .doc(payload.contract_id)
            .update({
              paymentStatus: 'paid',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          
          // Create notification for contract owner
          const contract = await admin.firestore()
            .collection('contracts')
            .doc(payload.contract_id)
            .get();
          
          if (contract.exists) {
            const contractData = contract.data();
            
            // Create notification for company
            await admin.firestore().collection('notifications').add({
              userId: contractData.companyID,
              title: 'Payment Received',
              message: `Payment of ${amount} has been received for contract ${contractData.title}`,
              read: false,
              type: 'payment_received',
              contractId: payload.contract_id,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
        
        return res.status(200).json({ success: true });
      } else if (payload.event_type === 'payment.failed') {
        // Handle failed payment
        const transactionId = payload.transaction_id;
        
        await admin.firestore()
          .collection('transactions')
          .doc(transactionId)
          .update({
            status: 'failed',
            errorMessage: payload.error_message || 'Payment failed',
            processedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        
        return res.status(200).json({ success: true });
      }
      
      // Handle other event types
      return res.status(200).json({ success: true, message: 'Unhandled event type' });
    } catch (error) {
      functions.logger.error('Error processing payment webhook', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}); 
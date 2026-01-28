import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { sendNotificationToUser } from '../../../../services/notifications';

const ScheduleInterviewSchema = z.object({
  applicationId: z.string(),
  hostUserId: z.string(),
  scheduledAt: z.string(),
  duration: z.number().default(60),
  type: z.enum(['VIDEO', 'IN_PERSON', 'PHONE']),
  location: z.string().optional(),
  videoLink: z.string().url().optional(),
});

interface ScheduleInterviewResult {
  interviewId: string;
  calendarEventCreated: boolean;
}

export const scheduleInterviewAction: ActionDefinition<typeof ScheduleInterviewSchema, ScheduleInterviewResult> = {
  id: "recruitment.schedule_interview",
  fileLocation: "src/services/actions/catalog/recruitment/interviews/scheduleInterview.ts",
  
  requiredPermission: "recruitment.schedule_interview",
  
  label: "Schedule Interview",
  description: "Book interview with calendar overlay and auto-invite",
  keywords: ["recruitment", "interview", "schedule", "calendar"],
  icon: "Calendar",
  
  schema: ScheduleInterviewSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { applicationId, hostUserId, scheduledAt, duration, type, location, videoLink } = input;

    const applicationRef = doc(db, 'recruitment_applications', applicationId);
    const applicationSnap = await getDoc(applicationRef);

    if (!applicationSnap.exists()) {
      throw new Error('Application not found');
    }

    const application = applicationSnap.data();

    const interviewDate = scheduledAt.split('T')[0];
    const interviewTime = scheduledAt.split('T')[1].substring(0, 5);

    const shiftsRef = collection(db, 'calendar_shifts');
    const hostConflictQuery = query(
      shiftsRef,
      where('userId', '==', hostUserId),
      where('date', '==', interviewDate)
    );
    const hostConflictSnapshot = await getDocs(hostConflictQuery);

    if (!hostConflictSnapshot.empty) {
      throw new Error(`Host ${hostUserId} has a conflict at ${scheduledAt}`);
    }

    const interviewsRef = collection(db, 'recruitment_interviews');
    const interviewDoc = await addDoc(interviewsRef, {
      applicationId,
      jobId: application.jobId,
      hostUserId,
      candidateUserId: application.userId,
      scheduledAt: new Date(scheduledAt),
      duration,
      type,
      location,
      videoLink,
      status: 'SCHEDULED',
      createdBy: ctx.userId,
      createdAt: serverTimestamp(),
    });

    const calendarBlockRef = collection(db, 'calendar_shifts');
    await addDoc(calendarBlockRef, {
      userId: hostUserId,
      facilityId: ctx.facilityId,
      date: interviewDate,
      startTime: interviewTime,
      endTime: calculateEndTime(interviewTime, duration),
      type: 'INTERVIEW',
      interviewId: interviewDoc.id,
      status: 'PUBLISHED',
      createdAt: serverTimestamp(),
    });

    await sendNotificationToUser(application.userId, {
      title: 'Interview Scheduled',
      body: `Interview scheduled for ${scheduledAt}`,
      priority: 'HIGH',
      actionUrl: `/recruitment/interviews/${interviewDoc.id}`,
    });
    await sendNotificationToUser(hostUserId, {
      title: 'Interview Scheduled',
      body: `Interview scheduled for ${scheduledAt}`,
      priority: 'HIGH',
      actionUrl: `/recruitment/interviews/${interviewDoc.id}`,
    });

    await ctx.auditLogger('recruitment.schedule_interview', 'SUCCESS', {
      interviewId: interviewDoc.id,
      applicationId,
      scheduledAt,
      type,
    });

    return {
      interviewId: interviewDoc.id,
      calendarEventCreated: true,
    };
  }
};

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}


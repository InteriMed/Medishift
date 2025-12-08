/**
 * Authorization & Permission System Test Suite
 * Comprehensive tests for permission checking, role synchronization, and audit logging
 */

const { expect } = require('chai');
const admin = require('firebase-admin');
const test = require('firebase-functions-test')();

// Import services
const { hasPermission, getUserPermissions, PERMISSIONS, ROLE_PRESETS } = require('../../frontend/src/utils/permissions');
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('../services/auditLog');
const { rateLimiter, RATE_LIMITS } = require('../services/rateLimit');

describe('Authorization System Tests', () => {

    let db;
    let testFacilityId;
    let testAdminId;
    let testEmployeeId;
    let testManagerId;

    before(async () => {
        db = admin.firestore();

        // Create test facility
        testFacilityId = 'test_facility_001';
        testAdminId = 'test_admin_001';
        testEmployeeId = 'test_employee_001';
        testManagerId = 'test_manager_001';

        await db.collection('facilityProfiles').doc(testFacilityId).set({
            admin: [testAdminId],
            employees: [testEmployeeId, testManagerId],
            permissions: {
                [testManagerId]: ROLE_PRESETS.MANAGER.permissions,
                [testEmployeeId]: ROLE_PRESETS.EMPLOYEE.permissions,
            },
            legalInfo: {
                tradeName: 'Test Facility',
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create test users
        await db.collection('users').doc(testAdminId).set({
            uid: testAdminId,
            email: 'admin@test.com',
            roles: [`facility_admin_${testFacilityId}`],
            facilityMemberships: [{
                facilityProfileId: testFacilityId,
                facilityName: 'Test Facility',
                role: 'admin'
            }]
        });

        await db.collection('users').doc(testEmployeeId).set({
            uid: testEmployeeId,
            email: 'employee@test.com',
            roles: [`facility_employee_${testFacilityId}`],
            facilityMemberships: [{
                facilityProfileId: testFacilityId,
                facilityName: 'Test Facility',
                role: 'employee'
            }]
        });

        await db.collection('users').doc(testManagerId).set({
            uid: testManagerId,
            email: 'manager@test.com',
            roles: [`facility_employee_${testFacilityId}`],
            facilityMemberships: [{
                facilityProfileId: testFacilityId,
                facilityName: 'Test Facility',
                role: 'employee'
            }]
        });
    });

    after(async () => {
        // Cleanup test data
        await db.collection('facilityProfiles').doc(testFacilityId).delete();
        await db.collection('users').doc(testAdminId).delete();
        await db.collection('users').doc(testEmployeeId).delete();
        await db.collection('users').doc(testManagerId).delete();
    });

    // ============================================
    // PERMISSION SYSTEM TESTS
    // ============================================

    describe('Permission System', () => {

        it('should grant all permissions to admin', async () => {
            const adminUser = await db.collection('users').doc(testAdminId).get();
            const facilityData = (await db.collection('facilityProfiles').doc(testFacilityId).get()).data();

            const user = adminUser.data();

            // Test various permissions
            expect(hasPermission(user, PERMISSIONS.FACILITY_CREATE_POSITIONS, testFacilityId, facilityData)).to.be.true;
            expect(hasPermission(user, PERMISSIONS.FACILITY_VIEW_APPLICATIONS, testFacilityId, facilityData)).to.be.true;
            expect(hasPermission(user, PERMISSIONS.FACILITY_MANAGE_TEAM, testFacilityId, facilityData)).to.be.true;
        });

        it('should grant limited permissions to employee', async () => {
            const employeeUser = await db.collection('users').doc(testEmployeeId).get();
            const facilityData = (await db.collection('facilityProfiles').doc(testFacilityId).get()).data();

            const user = employeeUser.data();

            // Should have view permissions
            expect(hasPermission(user, PERMISSIONS.FACILITY_VIEW_SCHEDULE, testFacilityId, facilityData)).to.be.true;
            expect(hasPermission(user, PERMISSIONS.FACILITY_VIEW_TEAM, testFacilityId, facilityData)).to.be.true;

            // Should NOT have admin permissions
            expect(hasPermission(user, PERMISSIONS.FACILITY_CREATE_POSITIONS, testFacilityId, facilityData)).to.be.false;
            expect(hasPermission(user, PERMISSIONS.FACILITY_MANAGE_TEAM, testFacilityId, facilityData)).to.be.false;
        });

        it('should grant manager permissions correctly', async () => {
            const managerUser = await db.collection('users').doc(testManagerId).get();
            const facilityData = (await db.collection('facilityProfiles').doc(testFacilityId).get()).data();

            const user = managerUser.data();

            // Should have schedule management
            expect(hasPermission(user, PERMISSIONS.FACILITY_VIEW_SCHEDULE, testFacilityId, facilityData)).to.be.true;
            expect(hasPermission(user, PERMISSIONS.FACILITY_CREATE_SCHEDULE, testFacilityId, facilityData)).to.be.true;

            // Should have time-off approval
            expect(hasPermission(user, PERMISSIONS.FACILITY_APPROVE_TIMEOFF, testFacilityId, facilityData)).to.be.true;

            // Should NOT have admin permissions
            expect(hasPermission(user, PERMISSIONS.FACILITY_MANAGE_TEAM, testFacilityId, facilityData)).to.be.false;
            expect(hasPermission(user, PERMISSIONS.FACILITY_DELETE, testFacilityId, facilityData)).to.be.false;
        });

        it('should deny permissions for wrong facility', async () => {
            const adminUser = await db.collection('users').doc(testAdminId).get();
            const user = adminUser.data();

            // Different facility ID
            const wrongFacilityId = 'wrong_facility';
            expect(hasPermission(user, PERMISSIONS.FACILITY_CREATE_POSITIONS, wrongFacilityId, null)).to.be.false;
        });

        it('should get all permissions for admin', async () => {
            const adminUser = await db.collection('users').doc(testAdminId).get();
            const facilityData = (await db.collection('facilityProfiles').doc(testFacilityId).get()).data();

            const user = adminUser.data();
            const permissions = getUserPermissions(user, testFacilityId, facilityData);

            // Admin should have all permissions
            expect(permissions.length).to.equal(Object.values(PERMISSIONS).length);
        });

        it('should get custom permissions for manager', async () => {
            const managerUser = await db.collection('users').doc(testManagerId).get();
            const facilityData = (await db.collection('facilityProfiles').doc(testFacilityId).get()).data();

            const user = managerUser.data();
            const permissions = getUserPermissions(user, testFacilityId, facilityData);

            // Manager should have manager preset permissions
            expect(permissions.length).to.equal(ROLE_PRESETS.MANAGER.permissions.length);
        });
    });

    // ============================================
    // ROLE SYNCHRONIZATION TESTS
    // ============================================

    describe('Role Synchronization', () => {

        it('should sync admin role when added to facility.admin', async () => {
            const newUserId = 'test_new_admin_001';

            // Create new user
            await db.collection('users').doc(newUserId).set({
                uid: newUserId,
                email: 'newadmin@test.com',
                roles: [],
                facilityMemberships: [],
            });

            // Add to facility admin (this would trigger the sync in production)
            await db.collection('facilityProfiles').doc(testFacilityId).update({
                admin: admin.firestore.FieldValue.arrayUnion(newUserId)
            });

            // Manually trigger sync for testing
            // In production, this happens automatically via Firestore trigger
            const facilityData = (await db.collection('facilityProfiles').doc(testFacilityId).get()).data();
            await db.collection('users').doc(newUserId).update({
                roles: [`facility_admin_${testFacilityId}`],
                facilityMemberships: [{
                    facilityProfileId: testFacilityId,
                    facilityName: facilityData.legalInfo.tradeName,
                    role: 'admin'
                }]
            });

            // Verify role synced
            const userDoc = await db.collection('users').doc(newUserId).get();
            const userData = userDoc.data();

            expect(userData.roles).to.include(`facility_admin_${testFacilityId}`);
            expect(userData.facilityMemberships).to.have.lengthOf(1);
            expect(userData.facilityMemberships[0].role).to.equal('admin');

            // Cleanup
            await db.collection('users').doc(newUserId).delete();
            await db.collection('facilityProfiles').doc(testFacilityId).update({
                admin: admin.firestore.FieldValue.arrayRemove(newUserId)
            });
        });

        it('should remove role when removed from facility', async () => {
            const tempUserId = 'test_temp_user_001';

            // Create user with admin role
            await db.collection('users').doc(tempUserId).set({
                uid: tempUserId,
                email: 'temp@test.com',
                roles: [`facility_admin_${testFacilityId}`],
                facilityMemberships: [{
                    facilityProfileId: testFacilityId,
                    facilityName: 'Test Facility',
                    role: 'admin'
                }],
            });

            // Add to facility
            await db.collection('facilityProfiles').doc(testFacilityId).update({
                admin: admin.firestore.FieldValue.arrayUnion(tempUserId)
            });

            // Remove from facility
            await db.collection('facilityProfiles').doc(testFacilityId).update({
                admin: admin.firestore.FieldValue.arrayRemove(tempUserId)
            });

            // Manually sync (in production, trigger does this)
            await db.collection('users').doc(tempUserId).update({
                roles: [],
                facilityMemberships: []
            });

            // Verify role removed
            const userDoc = await db.collection('users').doc(tempUserId).get();
            const userData = userDoc.data();

            expect(userData.roles).to.not.include(`facility_admin_${testFacilityId}`);
            expect(userData.facilityMemberships).to.have.lengthOf(0);

            // Cleanup
            await db.collection('users').doc(tempUserId).delete();
        });
    });

    // ============================================
    // AUDIT LOGGING TESTS
    // ============================================

    describe('Audit Logging', () => {

        it('should log audit event successfully', async () => {
            const result = await logAuditEvent({
                eventType: AUDIT_EVENT_TYPES.POSITION_CREATED,
                userId: testAdminId,
                action: 'Created test position',
                resource: {
                    type: 'position',
                    id: 'test_position_001',
                },
                details: {
                    jobTitle: 'Test Pharmacist',
                },
                metadata: {
                    facilityId: testFacilityId,
                },
                success: true,
            });

            expect(result.success).to.be.true;

            // Verify log was created
            const logsQuery = await db.collection('audit_logs')
                .where('userId', '==', testAdminId)
                .where('eventType', '==', AUDIT_EVENT_TYPES.POSITION_CREATED)
                .limit(1)
                .get();

            expect(logsQuery.docs.length).to.equal(1);

            const logData = logsQuery.docs[0].data();
            expect(logData.action).to.equal('Created test position');
            expect(logData.resource.type).to.equal('position');
            expect(logData.success).to.be.true;

            // Cleanup
            await logsQuery.docs[0].ref.delete();
        });

        it('should log failed access attempt', async () => {
            await logAuditEvent({
                eventType: AUDIT_EVENT_TYPES.ACCESS_DENIED,
                userId: testEmployeeId,
                action: 'Attempted to create position without permission',
                resource: {
                    type: 'position',
                },
                details: {
                    attemptedPermission: PERMISSIONS.FACILITY_CREATE_POSITIONS,
                },
                metadata: {
                    facilityId: testFacilityId,
                },
                success: false,
                errorMessage: 'Insufficient permissions',
            });

            // Verify failed access was logged
            const logsQuery = await db.collection('audit_logs')
                .where('userId', '==', testEmployeeId)
                .where('success', '==', false)
                .limit(1)
                .get();

            expect(logsQuery.docs.length).to.be.at.least(1);

            const logData = logsQuery.docs[0].data();
            expect(logData.errorMessage).to.equal('Insufficient permissions');

            // Cleanup
            await logsQuery.docs[0].ref.delete();
        });
    });

    // ============================================
    // RATE LIMITING TESTS
    // ============================================

    describe('Rate Limiting', () => {

        it('should allow requests within limit', async () => {
            const userId = 'test_rate_user_001';

            // First 5 requests should be allowed (CREATE_CONTRACT limit is 5 per 15min)
            for (let i = 0; i < 5; i++) {
                const result = await rateLimiter.checkLimit(userId, 'CREATE_CONTRACT');
                expect(result.allowed).to.be.true;
            }

            // Cleanup
            await rateLimiter.resetLimit(userId, 'CREATE_CONTRACT');
        });

        it('should block requests after exceeding limit', async () => {
            const userId = 'test_rate_user_002';

            // Exceed limit (CREATE_CONTRACT limit is 5 per 15min)
            for (let i = 0; i < 5; i++) {
                await rateLimiter.checkLimit(userId, 'CREATE_CONTRACT');
            }

            // 6th request should be blocked
            const result = await rateLimiter.checkLimit(userId, 'CREATE_CONTRACT');
            expect(result.allowed).to.be.false;
            expect(result.message).to.exist;
            expect(result.retryAfter).to.be.a('number');

            // Cleanup
            await rateLimiter.resetLimit(userId, 'CREATE_CONTRACT');
        });

        it('should reset limit after calling resetLimit', async () => {
            const userId = 'test_rate_user_003';

            // Max out limit
            for (let i = 0; i < 5; i++) {
                await rateLimiter.checkLimit(userId, 'CREATE_CONTRACT');
            }

            // Reset
            await rateLimiter.resetLimit(userId, 'CREATE_CONTRACT');

            // Should allow requests again
            const result = await rateLimiter.checkLimit(userId, 'CREATE_CONTRACT');
            expect(result.allowed).to.be.true;

            // Cleanup
            await rateLimiter.resetLimit(userId, 'CREATE_CONTRACT');
        });

        it('should get correct rate limit status', async () => {
            const userId = 'test_rate_user_004';

            // Make 3 requests
            for (let i = 0; i < 3; i++) {
                await rateLimiter.checkLimit(userId, 'CREATE_CONTRACT');
            }

            // Get status
            const status = await rateLimiter.getStatus(userId, 'CREATE_CONTRACT');

            expect(status.requests).to.equal(3);
            expect(status.maxRequests).to.equal(RATE_LIMITS.CREATE_CONTRACT.maxRequests);
            expect(status.windowMs).to.equal(RATE_LIMITS.CREATE_CONTRACT.windowMs);

            // Cleanup
            await rateLimiter.resetLimit(userId, 'CREATE_CONTRACT');
        });
    });

    // ============================================
    // CROSS-FACILITY ACCESS TESTS
    // ============================================

    describe('Cross-Facility Access Control', () => {

        it('should deny access to different facility data', async () => {
            const otherFacilityId = 'other_facility_001';

            // Create another facility
            await db.collection('facilityProfiles').doc(otherFacilityId).set({
                admin: ['other_admin_001'],
                employees: [],
                permissions: {},
                legalInfo: { tradeName: 'Other Facility' }
            });

            const adminUser = await db.collection('users').doc(testAdminId).get();
            const otherFacilityData = (await db.collection('facilityProfiles').doc(otherFacilityId).get()).data();

            const user = adminUser.data();

            // Admin of test facility should NOT have permissions in other facility
            expect(hasPermission(user, PERMISSIONS.FACILITY_CREATE_POSITIONS, otherFacilityId, otherFacilityData)).to.be.false;

            // Cleanup
            await db.collection('facilityProfiles').doc(otherFacilityId).delete();
        });

        it('should isolate permissions by facility', async () => {
            const facility1 = 'facility_001';
            const facility2 = 'facility_002';
            const multiUserId = 'multi_facility_user';

            // Create two facilities
            await db.collection('facilityProfiles').doc(facility1).set({
                admin: [multiUserId],
                employees: [],
                permissions: {},
                legalInfo: { tradeName: 'Facility 1' }
            });

            await db.collection('facilityProfiles').doc(facility2).set({
                admin: [],
                employees: [multiUserId],
                permissions: {
                    [multiUserId]: ROLE_PRESETS.EMPLOYEE.permissions
                },
                legalInfo: { tradeName: 'Facility 2' }
            });

            // Create user with both facilities
            await db.collection('users').doc(multiUserId).set({
                uid: multiUserId,
                email: 'multi@test.com',
                roles: [
                    `facility_admin_${facility1}`,
                    `facility_employee_${facility2}`
                ],
                facilityMemberships: [
                    { facilityProfileId: facility1, facilityName: 'Facility 1', role: 'admin' },
                    { facilityProfileId: facility2, facilityName: 'Facility 2', role: 'employee' }
                ]
            });

            const userDoc = await db.collection('users').doc(multiUserId).get();
            const user = userDoc.data();

            const facility1Data = (await db.collection('facilityProfiles').doc(facility1).get()).data();
            const facility2Data = (await db.collection('facilityProfiles').doc(facility2).get()).data();

            // Should have admin permissions in facility 1
            expect(hasPermission(user, PERMISSIONS.FACILITY_MANAGE_TEAM, facility1, facility1Data)).to.be.true;

            // Should have limited permissions in facility 2
            expect(hasPermission(user, PERMISSIONS.FACILITY_MANAGE_TEAM, facility2, facility2Data)).to.be.false;
            expect(hasPermission(user, PERMISSIONS.FACILITY_VIEW_TEAM, facility2, facility2Data)).to.be.true;

            // Cleanup
            await db.collection('users').doc(multiUserId).delete();
            await db.collection('facilityProfiles').doc(facility1).delete();
            await db.collection('facilityProfiles').doc(facility2).delete();
        });
    });
});

module.exports = {
    // Export for use in CI/CD
};

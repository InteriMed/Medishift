const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs");

const { FUNCTION_CONFIG } = require("../config/keysDatabase");

const execAsync = promisify(exec);

exports.analyzeTeamOrganigram = onCall(
  {
    ...FUNCTION_CONFIG,
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: "512MiB"
  },
  async (request) => {
    const logPrefix = `[AnalyzeTeamOrganigram-${request.auth ? request.auth.uid : "anon"}-${Date.now()}]`;

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to analyze team organigram"
      );
    }

    const { roles, employees, adminRightsHierarchy } = request.data;

    if (!roles || !Array.isArray(roles)) {
      throw new HttpsError(
        "invalid-argument",
        "roles must be provided as an array"
      );
    }

    if (!employees || !Array.isArray(employees)) {
      throw new HttpsError(
        "invalid-argument",
        "employees must be provided as an array"
      );
    }

    if (!adminRightsHierarchy || !Array.isArray(adminRightsHierarchy)) {
      throw new HttpsError(
        "invalid-argument",
        "adminRightsHierarchy must be provided as an array"
      );
    }

    try {
      logger.info(`${logPrefix} Starting team organigram analysis`, {
        rolesCount: roles.length,
        employeesCount: employees.length,
        adminLevelsCount: adminRightsHierarchy.length
      });

      const scriptPath = path.join(__dirname, "../organization/teamOrganigramAnalyzer.py");
      
      if (!fs.existsSync(scriptPath)) {
        logger.error(`${logPrefix} Python script not found at ${scriptPath}`);
        throw new HttpsError(
          "internal",
          "Analysis service unavailable"
        );
      }

      const inputData = JSON.stringify({
        roles,
        employees,
        adminRightsHierarchy
      });

      const pythonCommand = `python3 "${scriptPath}" '${inputData.replace(/'/g, "'\\''")}'`;

      logger.info(`${logPrefix} Executing Python script`);

      const { stdout, stderr } = await execAsync(pythonCommand, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 50000
      });

      if (stderr && !stderr.includes("WARNING") && !stderr.includes("INFO")) {
        logger.warn(`${logPrefix} Python script stderr: ${stderr}`);
      }

      let result;
      try {
        result = JSON.parse(stdout);
      } catch (parseError) {
        logger.error(`${logPrefix} Failed to parse Python output`, {
          stdout: stdout.substring(0, 500),
          error: parseError.message
        });
        throw new HttpsError(
          "internal",
          "Failed to parse analysis results"
        );
      }

      if (result.error) {
        logger.error(`${logPrefix} Python script returned error`, result);
        throw new HttpsError(
          "internal",
          result.error || "Analysis failed"
        );
      }

      logger.info(`${logPrefix} Analysis complete`, {
        nodesCount: result.nodes?.length || 0,
        edgesCount: result.edges?.length || 0
      });

      return {
        success: true,
        graphData: result
      };
    } catch (error) {
      logger.error(`${logPrefix} Error during analysis`, {
        error: error.message,
        stack: error.stack
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Analysis failed: ${error.message}`
      );
    }
  }
);


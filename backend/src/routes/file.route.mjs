import express from "express";
import multer from "multer";
import { Storage } from "@google-cloud/storage";
import pool from "../db.mjs";
import logger from "../logger.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import {
  resolveProjectIdFromRequest,
  requireProjectMember,
} from "../middlewares/projectMember.middleware.mjs";

const router = express.Router();
const storage = new Storage();
const FILE_BUCKET = process.env.GCS_BUCKET || "workspace.baeun.com";
const SIGNED_URL_TTL_MS = 15 * 60 * 1000;
const FILE_MAX_SIZE = 20 * 1024 * 1024;
const FOLDER_MARKER_FILE = ".keep";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_MAX_SIZE, files: 1 },
});

const isSigningCredentialError = (error) =>
  String(error?.message || "").includes("Cannot sign data without `client_email`");

const normalizePathSegments = (value) => {
  if (typeof value !== "string" || !value.trim()) return [];

  return value
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part === "." || part === "..") {
        throw new Error("INVALID_PATH");
      }
      return part;
    });
};

const sanitizeFileName = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const baseName = raw.split(/[\\/]/).pop().trim();
  if (!baseName || baseName === "." || baseName === "..") {
    return "";
  }

  return baseName;
};

const sanitizeFolderName = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = raw.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!normalized || normalized.includes("/") || normalized === "." || normalized === "..") {
    return "";
  }

  return normalized;
};

const resolveWorkspaceIdByProjectId = async (projectId) => {
  const projectRes = await pool.query("SELECT workspace_id FROM project WHERE id = $1", [projectId]);
  return projectRes.rows[0]?.workspace_id || null;
};

const buildProjectPrefix = (workspaceId, projectId) => `w-${workspaceId}/p-${projectId}`;

const resolveFileAccessContext = async (projectId, objectPath) => {
  const workspaceId = await resolveWorkspaceIdByProjectId(projectId);
  if (!workspaceId) {
    return { ok: false, status: 404, message: "프로젝트를 찾을 수 없습니다." };
  }

  const projectPrefix = buildProjectPrefix(workspaceId, projectId);
  if (objectPath && !objectPath.startsWith(`${projectPrefix}/`)) {
    return { ok: false, status: 403, message: "접근 권한이 없습니다." };
  }

  const bucket = storage.bucket(FILE_BUCKET);
  return { ok: true, bucket, projectPrefix };
};

const mapStorageFileToItem = (file, prefix) => {
  const objectPath = String(file.name || "");
  const relative = objectPath.startsWith(`${prefix}/`) ? objectPath.slice(prefix.length + 1) : objectPath;
  const name = relative.split("/").pop() || relative;

  return {
    id: objectPath,
    name,
    type: "file",
    object_path: objectPath,
    size: file.metadata?.size ? `${Math.round(Number(file.metadata.size) / 1024)} KB` : null,
    mime_type: file.metadata?.contentType || "application/octet-stream",
    updated_at: file.metadata?.updated || null,
  };
};

const isFolderMarkerPath = (path) => String(path || "").endsWith(`/${FOLDER_MARKER_FILE}`);

router.get(
  "/list",
  isAuth,
  resolveProjectIdFromRequest,
  requireProjectMember,
  async (req, res) => {
    const projectId = req.projectId;

    try {
      const workspaceId = await resolveWorkspaceIdByProjectId(projectId);
      if (!workspaceId) {
        return res.status(404).json({ name: "NotFound", message: "프로젝트를 찾을 수 없습니다." });
      }

      const relativeSegments = normalizePathSegments(String(req.query.path || ""));
      const relativePath = relativeSegments.join("/");
      const projectPrefix = buildProjectPrefix(workspaceId, projectId);
      const prefix = relativePath ? `${projectPrefix}/${relativePath}/` : `${projectPrefix}/`;
      const bucket = storage.bucket(FILE_BUCKET);

      const [files, , apiResponse] = await bucket.getFiles({
        prefix,
        delimiter: "/",
      });

      const folderItems = (apiResponse?.prefixes || []).map((folderPrefix) => {
        const trimmed = String(folderPrefix || "").replace(/\/$/, "");
        const name = trimmed.split("/").pop();
        return {
          id: name,
          name,
          type: "folder",
        };
      });

      const fileItems = files
        .filter((file) => file.name !== prefix)
        .filter((file) => !isFolderMarkerPath(file.name))
        .map((file) => mapStorageFileToItem(file, projectPrefix));

      return res.json({
        success: true,
        data: {
          path: relativePath,
          items: [...folderItems, ...fileItems],
        },
      });
    } catch (error) {
      if (error?.message === "INVALID_PATH") {
        return res.status(400).json({ name: "BadRequest", message: "유효하지 않은 path 입니다." });
      }

      logger.error("file list error", {
        err: error?.message,
        stack: error?.stack,
        projectId,
      });
      return res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

router.post(
  "/folders",
  isAuth,
  resolveProjectIdFromRequest,
  requireProjectMember,
  async (req, res) => {
    const projectId = req.projectId;
    const folderName = sanitizeFolderName(req.body?.folder_name);

    if (!folderName) {
      return res.status(400).json({ name: "BadRequest", message: "folder_name is required" });
    }

    try {
      const workspaceId = await resolveWorkspaceIdByProjectId(projectId);
      if (!workspaceId) {
        return res.status(404).json({ name: "NotFound", message: "프로젝트를 찾을 수 없습니다." });
      }

      const relativeSegments = normalizePathSegments(String(req.body?.path || ""));
      const relativePath = relativeSegments.join("/");
      const projectPrefix = buildProjectPrefix(workspaceId, projectId);
      const folderPrefix = relativePath
        ? `${projectPrefix}/${relativePath}/${folderName}`
        : `${projectPrefix}/${folderName}`;
      const markerPath = `${folderPrefix}/${FOLDER_MARKER_FILE}`;

      const bucket = storage.bucket(FILE_BUCKET);
      const markerFile = bucket.file(markerPath);
      const [exists] = await markerFile.exists();

      if (exists) {
        return res.status(409).json({ name: "Conflict", message: "이미 동일한 폴더가 존재합니다." });
      }

      await markerFile.save(Buffer.alloc(0), {
        resumable: false,
        contentType: "application/octet-stream",
      });

      return res.status(201).json({
        success: true,
        data: {
          folder_path: folderPrefix,
        },
      });
    } catch (error) {
      if (error?.message === "INVALID_PATH") {
        return res.status(400).json({ name: "BadRequest", message: "유효하지 않은 path 입니다." });
      }

      logger.error("create folder error", {
        err: error?.message,
        stack: error?.stack,
        projectId,
      });
      return res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

router.post(
  "/upload-url",
  isAuth,
  resolveProjectIdFromRequest,
  requireProjectMember,
  async (req, res) => {
    const projectId = req.projectId;
    const fileName = sanitizeFileName(req.body?.file_name);
    const mimeType = String(req.body?.mime_type || "application/octet-stream");

    if (!fileName) {
      return res.status(400).json({ name: "BadRequest", message: "file_name is required" });
    }

    try {
      const workspaceId = await resolveWorkspaceIdByProjectId(projectId);
      if (!workspaceId) {
        return res.status(404).json({ name: "NotFound", message: "프로젝트를 찾을 수 없습니다." });
      }

      const relativeSegments = normalizePathSegments(String(req.body?.path || ""));
      const relativePath = relativeSegments.join("/");
      const projectPrefix = buildProjectPrefix(workspaceId, projectId);
      const objectPath = relativePath
        ? `${projectPrefix}/${relativePath}/${fileName}`
        : `${projectPrefix}/${fileName}`;

      const bucket = storage.bucket(FILE_BUCKET);
      const file = bucket.file(objectPath);
      let uploadUrl = null;
      let mode = "signed";

      try {
        [uploadUrl] = await file.getSignedUrl({
          version: "v4",
          action: "write",
          expires: Date.now() + SIGNED_URL_TTL_MS,
          contentType: mimeType,
        });
      } catch (signError) {
        if (!isSigningCredentialError(signError)) {
          throw signError;
        }

        mode = "proxy";
      }

      return res.json({
        success: true,
        data: {
          object_path: objectPath,
          upload_url: uploadUrl,
          mode,
        },
      });
    } catch (error) {
      if (error?.message === "INVALID_PATH") {
        return res.status(400).json({ name: "BadRequest", message: "유효하지 않은 path 입니다." });
      }

      logger.error("file upload url error", {
        err: error?.message,
        stack: error?.stack,
        projectId,
      });
      return res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

router.post(
  "/upload",
  isAuth,
  upload.single("file"),
  resolveProjectIdFromRequest,
  requireProjectMember,
  async (req, res) => {
    const projectId = req.projectId;
    const filePayload = req.file;

    if (!filePayload) {
      return res.status(400).json({ name: "BadRequest", message: "file is required" });
    }

    try {
      const workspaceId = await resolveWorkspaceIdByProjectId(projectId);
      if (!workspaceId) {
        return res.status(404).json({ name: "NotFound", message: "프로젝트를 찾을 수 없습니다." });
      }

      const relativeSegments = normalizePathSegments(String(req.body?.path || ""));
      const relativePath = relativeSegments.join("/");
      const fileName = sanitizeFileName(req.body?.file_name || filePayload.originalname);

      if (!fileName) {
        return res.status(400).json({ name: "BadRequest", message: "file_name is required" });
      }

      const projectPrefix = buildProjectPrefix(workspaceId, projectId);
      const objectPath = relativePath
        ? `${projectPrefix}/${relativePath}/${fileName}`
        : `${projectPrefix}/${fileName}`;

      const bucket = storage.bucket(FILE_BUCKET);
      const file = bucket.file(objectPath);

      await file.save(filePayload.buffer, {
        resumable: false,
        contentType: filePayload.mimetype || "application/octet-stream",
      });

      return res.json({
        success: true,
        data: {
          object_path: objectPath,
        },
      });
    } catch (error) {
      if (error?.message === "INVALID_PATH") {
        return res.status(400).json({ name: "BadRequest", message: "유효하지 않은 path 입니다." });
      }

      logger.error("file upload proxy error", {
        err: error?.message,
        stack: error?.stack,
        projectId,
      });
      return res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

router.get(
  "/download",
  isAuth,
  resolveProjectIdFromRequest,
  requireProjectMember,
  async (req, res) => {
    const projectId = req.projectId;
    const objectPath = String(req.query.object_path || "").trim();

    if (!objectPath) {
      return res.status(400).json({ name: "BadRequest", message: "object_path is required" });
    }

    try {
      const access = await resolveFileAccessContext(projectId, objectPath);
      if (!access.ok) {
        return res.status(access.status).json({ name: access.status === 404 ? "NotFound" : "Forbidden", message: access.message });
      }

      const file = access.bucket.file(objectPath);
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ name: "NotFound", message: "파일을 찾을 수 없습니다." });
      }

      const [metadata] = await file.getMetadata();
      const fileName = objectPath.split("/").pop() || "download";

      res.setHeader("Content-Type", metadata?.contentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

      file.createReadStream().on("error", (streamError) => {
        logger.error("file download stream error", {
          err: streamError?.message,
          stack: streamError?.stack,
          projectId,
          objectPath,
        });
        if (!res.headersSent) {
          res.status(500).json({ name: "InternalServerError", message: streamError.message });
        }
      }).pipe(res);
    } catch (error) {
      logger.error("file download proxy error", {
        err: error?.message,
        stack: error?.stack,
        projectId,
      });
      return res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

router.get(
  "/download-url",
  isAuth,
  resolveProjectIdFromRequest,
  requireProjectMember,
  async (req, res) => {
    const projectId = req.projectId;
    const objectPath = String(req.query.object_path || "").trim();

    if (!objectPath) {
      return res.status(400).json({ name: "BadRequest", message: "object_path is required" });
    }

    try {
      const access = await resolveFileAccessContext(projectId, objectPath);
      if (!access.ok) {
        return res
          .status(access.status)
          .json({ name: access.status === 404 ? "NotFound" : "Forbidden", message: access.message });
      }

      const file = access.bucket.file(objectPath);
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ name: "NotFound", message: "파일을 찾을 수 없습니다." });
      }

      let downloadUrl = null;
      let mode = "signed";

      try {
        [downloadUrl] = await file.getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + SIGNED_URL_TTL_MS,
        });
      } catch (signError) {
        if (!isSigningCredentialError(signError)) {
          throw signError;
        }
        mode = "proxy";
        downloadUrl = `/api/files/download?project_id=${encodeURIComponent(String(projectId))}&object_path=${encodeURIComponent(objectPath)}`;
      }

      return res.json({
        success: true,
        data: {
          download_url: downloadUrl,
          mode,
        },
      });
    } catch (error) {
      logger.error("file download url error", {
        err: error?.message,
        stack: error?.stack,
        projectId,
      });
      return res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

export default router;

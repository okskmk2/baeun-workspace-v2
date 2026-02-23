import express from "express";
import { getActiveSocketCount } from "../ws.mjs";

const router = express.Router();

router.get("/online", (req, res) => {
  res.json({
    success: true,
    data: {
      sockets: getActiveSocketCount(),
    },
  });
});

export default router;

const router = require("express").Router();
const { preferences, listNotifications } = require("../services/notificationPreferenceService");
router.use(require("../middleware/requireAuthApi"));
const handle = action => async (req, res, next) => {
  try { res.json(await action(req)); }
  catch (error) {
    if ([400, 404, 503].includes(error.status)) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};
router.get("/preferences", handle(req => preferences(req.session.userId)));
router.patch("/preferences", handle(req => preferences(req.session.userId, req.body)));
router.get("/", handle(req => listNotifications(req.session.userId)));
module.exports = router;

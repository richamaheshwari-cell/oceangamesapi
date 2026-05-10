const express = require("express");
const settings = require("./settings");
const pages = require("./pages");
const adminUsers = require("./adminUsers");
const role = require("./role");

const auth = require("./auth");
const changePassword = require("./changePassword");
const forgotPassword = require("./forgotPassword");
const me = require("./me");

const router = express.Router();
const casinos = require("./casinos");
const casinoArticles = require("./casinoArticles");
const games = require("./games");
const gameArticles = require("./gameArticles");
const blogs = require("./blogs");
const news = require("./news");
const bonuses = require("./bonuses");
const bonusArticles = require("./bonusArticles");
const upload = require("./upload");
const newsletter = require("./newsletter");
const dashboard = require("./dashboard");

router.use("/", dashboard);
router.use("/", casinos);
router.use("/", casinoArticles);
router.use("/", games);
router.use("/", gameArticles);
router.use("/", blogs);
router.use("/", news);
router.use("/", bonuses);
router.use("/", bonusArticles);
router.use("/auth", auth);
router.use("/", changePassword);
router.use("/", forgotPassword);
router.use("/", me);
router.use("/role", role);
router.use("/", settings);
router.use("/", pages);
router.use("/", adminUsers);
router.use("/", upload);
router.use("/", newsletter);

module.exports = router;

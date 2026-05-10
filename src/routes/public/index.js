const express = require("express");
const { ok } = require("../../utils/http");

const router = express.Router();

const settings = require("./settings");
const pages = require("./pages");
const casinos = require("./casinos");
const casinoArticles = require("./casinoArticles");
const games = require("./games");
const gameArticles = require("./gameArticles");
const blogs = require("./blogs");
const news = require("./news");
const bonuses = require("./bonuses");
const bonusArticles = require("./bonusArticles");
const search = require("./search");
const author = require("./author");
const editors = require("./editors");
const newsletter = require("./newsletter");

router.use("/", settings);
router.use("/", pages);
router.use("/", casinos);
router.use("/", casinoArticles);
router.use("/", games);
router.use("/", gameArticles);
router.use("/", blogs);
router.use("/", news);
router.use("/", bonuses);
router.use("/", bonusArticles);
router.use("/", search);
router.use("/", author);
router.use("/", editors);
router.use("/", newsletter);

router.get("/ping", (req, res) => ok(res, { ok: true }));

module.exports = router;

const express = require("express");
const { z } = require("zod");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");
const { sendNewsletterSubscribedEmail, sendNewsletterUnsubscribedEmail } = require("../../utils/newsletterMailer");

const router = express.Router();

const subscribeSchema = z.object({
  email: z.string().email(),
});

const unsubscribeSchema = z.object({
  email: z.string().email(),
});

// POST /api/v1/public/newsletter/subscribe
router.post(
  "/newsletter/subscribe",
  asyncHandler(async (req, res) => {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    const { email } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.subscribed) {
        return ok(res, { message: "Already subscribed.", subscribed: true });
      }
      await prisma.newsletterSubscription.update({
        where: { id: existing.id },
        data: { subscribed: true, subscribedAt: new Date(), unsubscribedAt: null },
      });
    } else {
      await prisma.newsletterSubscription.create({
        data: { email: normalizedEmail, subscribed: true },
      });
    }

    try {
      await sendNewsletterSubscribedEmail(normalizedEmail);
    } catch (err) {
      console.error("Newsletter confirmation email failed:", err);
      // still return success
    }

    return ok(res, { message: "Subscribed successfully.", subscribed: true });
  })
);

// POST /api/v1/public/newsletter/unsubscribe
router.post(
  "/newsletter/unsubscribe",
  asyncHandler(async (req, res) => {
    const parsed = unsubscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    const { email } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (!existing) {
      return ok(res, { message: "Email not in list.", subscribed: false });
    }
    if (!existing.subscribed) {
      return ok(res, { message: "Already unsubscribed.", subscribed: false });
    }

    await prisma.newsletterSubscription.update({
      where: { id: existing.id },
      data: { subscribed: false, unsubscribedAt: new Date() },
    });

    try {
      await sendNewsletterUnsubscribedEmail(normalizedEmail);
    } catch (err) {
      console.error("Newsletter unsubscribed email failed:", err);
    }

    return ok(res, { message: "Unsubscribed successfully.", subscribed: false });
  })
);

module.exports = router;

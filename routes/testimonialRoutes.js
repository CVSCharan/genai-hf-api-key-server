const express = require("express");
const router = express.Router();
const testimonialController = require("../controllers/testimonialController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

// Log route access
const logRoute = (req, res, next) => {
  logger.info(`Testimonial route accessed: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
  });
  next();
};

// Apply logging middleware to all routes
router.use(logRoute);

// Public routes
router.get("/approved", testimonialController.getApprovedTestimonialsWithPagination);
router.get("/recent", testimonialController.getRecentApprovedTestimonials);
router.post("/public", testimonialController.createTestimonial);

// Authenticated user routes
router.post("/", isAuthenticated, testimonialController.createTestimonial);
router.get(
  "/my-testimonials",
  isAuthenticated,
  testimonialController.getUserTestimonials
);
router.put("/:id", isAuthenticated, testimonialController.updateTestimonial);
router.delete("/:id", isAuthenticated, testimonialController.deleteTestimonial);

// Admin routes
router.get(
  "/all",
  isAuthenticated,
  isAdmin,
  testimonialController.getAllTestimonials
);

// Route for approving/rejecting testimonials
router.put(
  "/approve/:id",
  isAuthenticated,
  isAdmin,
  testimonialController.approveTestimonial
);

module.exports = router;

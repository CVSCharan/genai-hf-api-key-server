const Testimonial = require("../models/Testimonial");
const User = require("../models/User");
const logger = require("../utils/logger");

// Create a new testimonial
exports.createTestimonial = async (testimonialData) => {
  try {
    const testimonial = new Testimonial(testimonialData);
    await testimonial.save();
    return testimonial;
  } catch (error) {
    logger.error("Error creating testimonial:", error);
    throw error;
  }
};

// Get all approved testimonials
exports.getApprovedTestimonials = async () => {
  try {
    const testimonials = await Testimonial.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "name picture",
      });
    return testimonials;
  } catch (error) {
    logger.error("Error fetching approved testimonials:", error);
    throw error;
  }
};

// Get all testimonials (admin only)
exports.getAllTestimonials = async () => {
  try {
    const testimonials = await Testimonial.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "name picture email",
      });
    return testimonials;
  } catch (error) {
    logger.error("Error fetching all testimonials:", error);
    throw error;
  }
};

// Get testimonial by ID
exports.getTestimonialById = async (id) => {
  try {
    const testimonial = await Testimonial.findById(id).populate({
      path: "user",
      select: "name picture",
    });
    return testimonial;
  } catch (error) {
    logger.error(`Error fetching testimonial with ID ${id}:`, error);
    throw error;
  }
};

// Update testimonial
exports.updateTestimonial = async (id, updateData) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    return testimonial;
  } catch (error) {
    logger.error(`Error updating testimonial with ID ${id}:`, error);
    throw error;
  }
};

// Delete testimonial
exports.deleteTestimonial = async (id) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(id);
    return testimonial;
  } catch (error) {
    logger.error(`Error deleting testimonial with ID ${id}:`, error);
    throw error;
  }
};

// Approve or reject testimonial
exports.approveTestimonial = async (id, isApproved) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      { isApproved },
      { new: true }
    );
    return testimonial;
  } catch (error) {
    logger.error(`Error ${isApproved ? "approving" : "rejecting"} testimonial with ID ${id}:`, error);
    throw error;
  }
};

// Get testimonials by user
exports.getUserTestimonials = async (userId) => {
  try {
    const testimonials = await Testimonial.find({ user: userId }).sort({
      createdAt: -1,
    });
    return testimonials;
  } catch (error) {
    logger.error(`Error fetching testimonials for user ${userId}:`, error);
    throw error;
  }
};
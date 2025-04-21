const Testimonial = require("../models/Testimonial");
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
    // Validate that we have a valid ID before attempting to update
    if (!id) {
      logger.error("Cannot approve testimonial: ID is undefined or null");
      throw new Error("Testimonial ID is required");
    }
    
    // Use mongoose's findByIdAndUpdate which expects the _id value, not the field name
    const testimonial = await Testimonial.findByIdAndUpdate(
      id,  // This is correct - mongoose will use this as the _id value
      { isApproved },
      { new: true }
    );
    
    if (!testimonial) {
      logger.warn(`No testimonial found with ID ${id}`);
      throw new Error("Testimonial not found");
    }
    
    logger.info(`Testimonial ${id} ${isApproved ? 'approved' : 'rejected'} successfully`);
    return testimonial;
  } catch (error) {
    logger.error(`Error ${isApproved ? "approving" : "rejecting"} testimonial with ID ${id}:`, {
      error: error.message,
      stack: error.stack
    });
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

// Get approved testimonials with pagination
exports.getApprovedTestimonialsWithPagination = async (page, limit, skip) => {
  try {
    // Get total count for pagination metadata
    const totalCount = await Testimonial.countDocuments({ isApproved: true });
    
    // Get paginated testimonials
    const testimonials = await Testimonial.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "name picture",
      });
    
    return { testimonials, totalCount };
  } catch (error) {
    logger.error("Error fetching approved testimonials with pagination:", {
      error: error.message,
      stack: error.stack,
      page,
      limit
    });
    throw error;
  }
};

// Get recent approved testimonials (limited to 10)
exports.getRecentApprovedTestimonials = async () => {
  try {
    const testimonials = await Testimonial.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "user",
        select: "name picture"
      });
    
    logger.info(`Retrieved ${testimonials.length} recent approved testimonials`);
    return testimonials;
  } catch (error) {
    logger.error("Error fetching recent approved testimonials:", {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};
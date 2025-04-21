const testimonialService = require("../services/testimonialService");
const logger = require("../utils/logger");

// Create a new testimonial
exports.createTestimonial = async (req, res) => {
  try {
    const { content, rating, position, company, name, avatar } = req.body;
    // Create testimonial data object
    const testimonialData = {
      content,
      rating,
      position,
      company,
      isApproved: false, // All testimonials require approval
    };

    // Check if this is an authenticated request
    if (req.user) {
      // For authenticated users, use their user ID
      testimonialData.user = req.user._id;

      // If name is provided, use it (otherwise user's name will be used via population)
      if (name) {
        testimonialData.name = name;
      }
    } else {
      // For public submissions, validate additional required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Name is required for public testimonials",
        });
      }

      // For public submissions:
      // Created a default user for public testimonials
      testimonialData.user =
        process.env.PUBLIC_USER_ID || "67f4cf5cc0678484cde7a0e2"; // Replace with your actual public user ID
      testimonialData.name = name;

      // Add avatar if provided
      if (avatar) {
        testimonialData.avatar = avatar;
      }
    }

    // Validate input
    if (!content || !rating) {
      return res.status(400).json({
        success: false,
        message: "Content and rating are required",
      });
    }

    // Create testimonial
    const testimonial = await testimonialService.createTestimonial(
      testimonialData
    );

    logger.info("Testimonial created successfully", {
      userId: testimonialData.user,
      testimonialId: testimonial._id,
    });

    res.status(201).json({
      success: true,
      message: "Testimonial submitted successfully and pending approval",
      testimonial,
    });
  } catch (error) {
    logger.error("Error creating testimonial:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get all approved testimonials (public)
exports.getApprovedTestimonials = async (req, res) => {
  try {
    const testimonials = await testimonialService.getApprovedTestimonials();

    res.json({
      success: true,
      count: testimonials.length,
      testimonials,
    });
  } catch (error) {
    logger.error("Error fetching approved testimonials:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get all testimonials (admin only)
exports.getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await testimonialService.getAllTestimonials();

    res.json({
      success: true,
      count: testimonials.length,
      testimonials,
    });
  } catch (error) {
    logger.error("Error fetching all testimonials:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get user's testimonials
exports.getUserTestimonials = async (req, res) => {
  try {
    const userId = req.user._id;
    const testimonials = await testimonialService.getUserTestimonials(userId);

    res.json({
      success: true,
      count: testimonials.length,
      testimonials,
    });
  } catch (error) {
    logger.error("Error fetching user testimonials:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Update testimonial
exports.updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, rating, position, company } = req.body;
    const userId = req.user._id;

    // Find testimonial
    const testimonial = await testimonialService.getTestimonialById(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    // Check if user owns this testimonial or is admin
    if (
      testimonial.user._id.toString() !== userId.toString() &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this testimonial",
      });
    }

    // Update testimonial
    const updatedTestimonial = await testimonialService.updateTestimonial(id, {
      content,
      rating,
      position,
      company,
      isApproved: req.user.isAdmin ? testimonial.isApproved : false, // Reset to pending if user updates
    });

    logger.info("Testimonial updated successfully", {
      userId,
      testimonialId: id,
    });
    res.json({
      success: true,
      message: "Testimonial updated successfully",
      testimonial: updatedTestimonial,
    });
  } catch (error) {
    logger.error("Error updating testimonial:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Delete testimonial
exports.deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find testimonial
    const testimonial = await testimonialService.getTestimonialById(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    // Check if user owns this testimonial or is admin
    if (
      testimonial.user._id.toString() !== userId.toString() &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this testimonial",
      });
    }

    // Delete testimonial
    await testimonialService.deleteTestimonial(id);

    logger.info("Testimonial deleted successfully", {
      userId,
      testimonialId: id,
    });
    res.json({
      success: true,
      message: "Testimonial deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting testimonial:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Approve or reject testimonial (admin only)
exports.approveTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    if (isApproved === undefined) {
      return res.status(400).json({
        success: false,
        message: "isApproved field is required",
      });
    }

    const testimonial = await testimonialService.approveTestimonial(
      id,
      isApproved
    );

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    logger.info(
      `Testimonial ${isApproved ? "approved" : "rejected"} successfully`,
      {
        adminId: req.user._id,
        testimonialId: id,
      }
    );

    res.json({
      success: true,
      message: `Testimonial ${
        isApproved ? "approved" : "rejected"
      } successfully`,
      testimonial,
    });
  } catch (error) {
    logger.error("Error approving/rejecting testimonial:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get approved testimonials with pagination
exports.getApprovedTestimonialsWithPagination = async (req, res) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get testimonials with pagination
    const { testimonials, totalCount } = await testimonialService.getApprovedTestimonialsWithPagination(
      page,
      limit,
      skip
    );
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);
    
    res.json({
      success: true,
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      testimonials,
    });
  } catch (error) {
    logger.error("Error fetching approved testimonials with pagination:", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get recent approved testimonials (limited to 10)
exports.getRecentApprovedTestimonials = async (req, res) => {
  try {
    const testimonials = await testimonialService.getRecentApprovedTestimonials();
    
    res.json({
      success: true,
      count: testimonials.length,
      testimonials
    });
  } catch (error) {
    logger.error("Error fetching recent approved testimonials:", {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

const huggingfaceService = require("../services/huggingfaceService");
const logger = require("../utils/logger");
const CryptoJS = require("crypto-js");

// Creative writing endpoint
exports.generateCreativeText = async (req, res) => {
  try {
    const { prompt, model, maxLength, temperature, apiKey } = req.body;

    // Decrypt the API key
    const encryptionKey = process.env.ENCRYPTION_KEY || "default-secret-key";
    let decryptedApiKey;
    try {
      decryptedApiKey = CryptoJS.AES.decrypt(apiKey, encryptionKey).toString(
        CryptoJS.enc.Utf8
      );
      if (!decryptedApiKey) {
        throw new Error("Failed to decrypt API key");
      }
    } catch (decryptError) {
      logger.error("Error decrypting API key:", decryptError);
      return res.status(400).json({
        success: false,
        message: "Invalid API key format",
      });
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "API key is required",
      });
    }

    const options = {
      model: model || "gpt2",
      maxLength: maxLength,
      temperature: temperature || 0.7,
    };

    const result = await huggingfaceService.generateCreativeText(
      req.user._id,
      decryptedApiKey, // Pass the decrypted API key
      prompt,
      options
    );

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error("Error in creative text generation controller:", error);

    // Check for the specific 402 Payment Required error from Hugging Face
    if (error.response && error.response.status === 402 && error.response.data?.error) {
      return res.status(402).json({
        success: false,
        message: error.response.data.error, // Pass the specific HF error message
      });
    }

    // Handle other specific errors or fallback to a generic 500
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during text generation",
    });
  }
};

// Sentiment analysis endpoint
exports.analyzeSentiment = async (req, res) => {
  try {
    const { prompt, apiKey, model } = req.body;

    // Decrypt the API key
    const encryptionKey = process.env.ENCRYPTION_KEY || "default-secret-key";
    let decryptedApiKey;
    try {
      decryptedApiKey = CryptoJS.AES.decrypt(apiKey, encryptionKey).toString(
        CryptoJS.enc.Utf8
      );
      if (!decryptedApiKey) {
        throw new Error("Failed to decrypt API key");
      }
    } catch (decryptError) {
      logger.error("Error decrypting API key:", decryptError);
      return res.status(400).json({
        success: false,
        message: "Invalid API key format",
      });
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "API key is required",
      });
    }

    // Specify the model explicitly in the options
    const options = {
      model: model || "distilbert-base-uncased-finetuned-sst-2-english",
    };

    const result = await huggingfaceService.analyzeSentiment(
      req.user._id,
      decryptedApiKey,
      prompt,
      options
    );

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error("Error in sentiment analysis controller:", error);

    // Check for the specific 402 Payment Required error from Hugging Face
    if (error.response && error.response.status === 402 && error.response.data?.error) {
      return res.status(402).json({
        success: false,
        message: error.response.data.error, // Pass the specific HF error message
      });
    }

    // Provide more specific error messages based on the error type
    if (error.message.includes("Invalid credentials")) {
      return res.status(401).json({
        success: false,
        message: "Invalid Hugging Face API key. Please check your credentials.",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during sentiment analysis",
    });
  }
};

// Conversational model endpoint
exports.conversationalResponse = async (req, res) => {
  try {
    const { message, past_user_inputs, generated_responses, model, apiKey } =
      req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "API key is required",
      });
    }

    // Decrypt the API key
    const encryptionKey = process.env.ENCRYPTION_KEY || "default-secret-key";
    let decryptedApiKey;
    try {
      decryptedApiKey = CryptoJS.AES.decrypt(apiKey, encryptionKey).toString(
        CryptoJS.enc.Utf8
      );
      if (!decryptedApiKey) {
        throw new Error("Failed to decrypt API key");
      }
    } catch (decryptError) {
      logger.error("Error decrypting API key:", decryptError);
      return res.status(400).json({
        success: false,
        message: "Invalid API key format",
      });
    }

    // Create options object with conversation history if provided
    const options = {
      past_user_inputs: past_user_inputs || [],
      generated_responses: generated_responses || [],
    };

    // Add model to options if provided
    if (model) {
      options.model = model;
    }

    const result = await huggingfaceService.conversationalResponse(
      req.user._id,
      decryptedApiKey,
      message,
      options
    );

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error("Error in conversational response controller:", error);

    // Check for the specific 402 Payment Required error from Hugging Face
    if (error.response && error.response.status === 402 && error.response.data?.error) {
      return res.status(402).json({
        success: false,
        message: error.response.data.error, // Pass the specific HF error message
      });
    }

    // Handle other specific errors or fallback to a generic 500
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during conversation",
    });
  }
};

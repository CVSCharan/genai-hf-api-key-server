const axios = require("axios");
const logger = require("../utils/logger");

const HF_API_URL = "https://api-inference.huggingface.co/models/";

// --- Helper Functions ---

// Log usage (replace with actual database logging if needed)
function logUsageToConsole(userId, serviceType, model) {
  logger.info("Hugging Face API usage", {
    userId,
    serviceType,
    model,
    service: "huggingface",
    timestamp: new Date().toISOString(),
  });
}

// Check if a model is likely too large for the free tier
async function isModelWithinSizeLimits(apiKey, modelName) {
  try {
    // These models are known to be too large for the free tier
    const knownLargeModels = [
      "mistralai/Mistral-7B",
      "meta-llama/Llama-2-7b",
      "tiiuae/falcon-7b",
      "mistralai/Mixtral-8x7B",
      "meta-llama/Llama-2-13b",
      "meta-llama/Llama-2-70b",
      "bigscience/bloom",
    ];

    // Check if the model name contains any of the known large model identifiers
    for (const largeModel of knownLargeModels) {
      if (modelName.toLowerCase().includes(largeModel.toLowerCase())) {
        logger.debug(
          `Model ${modelName} is likely too large (matches pattern: ${largeModel})`
        );
        return false;
      }
    }

    // Check for models with size indicators in their name
    const sizeRegex = /(\d+)[bB](-|\b)/;
    const sizeMatch = modelName.match(sizeRegex);
    if (sizeMatch) {
      const sizeInB = parseInt(sizeMatch[1]);
      if (sizeInB >= 7) {
        logger.debug(
          `Model ${modelName} is likely too large (size indicator: ${sizeInB}B)`
        );
        return false;
      }
    }

    // If we can't determine from the name, assume it's within limits
    return true;
  } catch (error) {
    logger.error(`Error checking model size for ${modelName}:`, {
      error: error.message,
    });
    return true; // Assume it's within limits if we can't check
  }
}

// Check model availability and readiness using only POST
async function checkModelAvailability(apiKey, modelName) {
  // First check if the model is likely to be within size limits
  const withinLimits = await isModelWithinSizeLimits(apiKey, modelName);
  if (!withinLimits) {
    logger.debug(`Model ${modelName} is likely too large for the free tier`);
    return false;
  }

  try {
    // Use a small POST request to check existence and readiness simultaneously
    await axios.post(
      `${HF_API_URL}${modelName}`,
      { inputs: "Hello" }, // Simple test input
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        // Use a shorter timeout for the check to avoid long waits for unavailable models
        timeout: 5000, // 5 seconds timeout for check
      }
    );
    // If the POST request succeeds (doesn't throw), the model is available and ready
    logger.debug(`Model ${modelName} is available (POST check successful)`);
    return true;
  } catch (error) {
    // Log the specific error for debugging
    logger.debug(`Error checking availability for model ${modelName} via POST:`, {
      error: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data // Include response data for more context
    });

    // Handle specific errors indicating unavailability or loading state
    if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 404) {
            logger.debug(`Model ${modelName} not found or inaccessible (404)`);
            return false;
        }
        if (status === 503) {
            logger.debug(`Model ${modelName} is unavailable (503), possibly loading or down`);
            return false;
        }
        if (errorData?.error?.includes("loading")) {
            logger.debug(`Model ${modelName} exists but is still loading`);
            return false;
        }
        if (errorData?.error?.includes("too large")) {
            logger.debug(`Model ${modelName} is too large to be loaded automatically`);
            return false;
        }
         if (status === 401) {
            logger.error(`Invalid API key detected during availability check for ${modelName}`);
            // Potentially throw here or handle globally, but for check, mark as unavailable
            return false;
        }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      logger.debug(`Network error during availability check for ${modelName}`);
      return false; // Network errors mean unavailable
    }

    // For any other errors during the check, conservatively assume unavailable
    logger.warn(`Assuming model ${modelName} is unavailable due to unhandled error during check.`);
    return false;
  }
}


// Get recommended fallback models based on task
function getRecommendedModels(task) {
  switch (task) {
    case "text-generation":
      return [
        "microsoft/phi-2", // 2.7B model, high quality
        "Qwen/Qwen1.5-0.5B-Chat", // Small but effective
        "TinyLlama/TinyLlama-1.1B-Chat-v1.0", // Small model that works well
        "EleutherAI/gpt-neo-125M", // Very small but reliable
        "gpt2-medium", // Medium size GPT-2
        "gpt2", // Last resort
      ];
    case "sentiment-analysis":
      return [
        "distilbert-base-uncased-finetuned-sst-2-english",
        "cardiffnlp/twitter-roberta-base-sentiment",
        "finiteautomata/bertweet-base-sentiment-analysis",
        "nlptown/bert-base-multilingual-uncased-sentiment",
      ];
    case "conversation":
      return [
        "microsoft/DialoGPT-medium",
        "facebook/blenderbot-400M-distill",
        "Qwen/Qwen1.5-0.5B-Chat",
        "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
      ];
    default:
      // Provide a reasonable default if task is unknown
      return ["gpt2-medium", "gpt2"];
  }
}

// Process raw text output into markdown
function processTextToMarkdown(text, prompt) {
    if (!text || typeof text !== 'string') return "";

    // Remove any JSON-like artifacts that might appear in the text
    text = text.replace(/\{"generated_text":/g, "")
               .replace(/\}$/g, "")
               .replace(/^"/, "")
               .replace(/"$/, "");

    // Handle common model-specific artifacts (e.g., chat markers)
    text = text.replace(/(<\|im_start\|>|<\|im_end\|>|<s>|<\/s>|<\|endoftext\|>|<\|assistant\|>|<\|user\|>|<\|system\|>)/g, "");

    // Remove repetitive patterns (adjust length threshold if needed)
    const repetitionRegex = /(.{30,})\1{2,}/g; // Look for 3+ repetitions
    text = text.replace(repetitionRegex, "$1");

    // Clean up escape sequences and excessive newlines
    text = text.replace(/\\"/g, '"')
               .replace(/\\'/g, "'")
               .replace(/\\n/g, "\n")
               .replace(/\\t/g, "\t")
               .replace(/\n{3,}/g, '\n\n'); // Collapse 3+ newlines to 2

    // Add a title based on the prompt if none exists
    let title = "";
    if (!text.trim().startsWith("#")) {
        const cleanPrompt = prompt.replace(/give me a|write a|tell me about|create a/gi, "").trim();
        const topicMatch = cleanPrompt.match(/^(short story|story|essay|poem|article|text) (about|on|regarding) (.+?)[\.\?]?$/i);

        if (topicMatch && topicMatch[3]) {
            const topicText = topicMatch[3].trim();
            title = `# ${topicText.charAt(0).toUpperCase() + topicText.slice(1)}\n\n`;
        } else {
            // Fallback to using first few words of prompt
            const promptWords = cleanPrompt.split(" ");
            const titleText = promptWords.slice(0, 5).join(" ");
            title = `# ${titleText}${promptWords.length > 5 ? '...' : ''}\n\n`;
        }
    }

    // Split text into paragraphs, trim, and filter empty ones
    let paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p);

    // Remove duplicated paragraphs
    const uniqueParagraphs = [];
    const seenParagraphs = new Set();
    for (const paragraph of paragraphs) {
        // Skip very short paragraphs (likely noise or artifacts)
        if (paragraph.length < 15) continue;

        const simplifiedPara = paragraph.toLowerCase().replace(/[^\w\s]/g, '');
        if (!seenParagraphs.has(simplifiedPara)) {
            uniqueParagraphs.push(paragraph);
            seenParagraphs.add(simplifiedPara);
        }
    }

    // Basic markdown structure (join paragraphs)
    const result = title + uniqueParagraphs.join("\n\n");

    // Ensure the text ends appropriately (e.g., with punctuation)
    if (result && !/[.!?]$/.test(result.slice(-1))) {
        return result + ".";
    }
    return result;
}


// Generate a fallback response when all models fail
function generateFallbackResponse(prompt) {
  logger.warn("Generating fallback response as all models failed.");
  return {
    generated_text: "I apologize, but I'm unable to generate a response at the moment due to service limitations.",
    formatted_markdown: "# Service Temporarily Unavailable\n\nI apologize, but I'm unable to generate a response to your request at the moment due to service limitations. Please try again later.",
    model_used: "fallback",
    fallback_used: true,
    notice: "Note: All Hugging Face models are currently unavailable. This is a fallback response."
  };
}

// Handle API errors and provide meaningful error messages or fallback
function handleApiError(error, prompt) { // Added prompt for fallback generation
  // Check for conditions where we should return a fallback response
  if (!error.response || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    logger.error("Network error or service down, providing fallback response", {
      error: error.message,
      code: error.code
    });
    // Instead of throwing, return the fallback response object
    return generateFallbackResponse(prompt);
  }

  // Handle specific HTTP status codes by throwing errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    const errorMessage = data?.error || error.message;

    if (status === 401) {
      throw new Error("Invalid credentials for Hugging Face API");
    } else if (status === 404) {
      const modelName = errorMessage.match(/Model (.*) does not exist/)?.[1] || "The specified model";
      throw new Error(`${modelName} does not exist on Hugging Face. Please check the model name.`);
    } else if (status === 403) {
      if (errorMessage.includes("too large")) {
        throw new Error("The selected model is too large for the free tier. Please try a smaller model.");
      } else {
        throw new Error(`Access denied: ${errorMessage}`);
      }
    } else if (status === 429) {
      throw new Error("Rate limit exceeded for Hugging Face API. Please try again later.");
    } else if (status === 503) {
       // For 503, also return fallback response as service is unavailable
       logger.error("Hugging Face service unavailable (503), providing fallback response", { error: errorMessage });
       return generateFallbackResponse(prompt);
    } else if (status === 400 && errorMessage.includes("loading")) {
      throw new Error("The model is still loading. Please try again in a few moments.");
    } else {
      // General API error
      throw new Error(`Hugging Face API error (${status}): ${errorMessage}`);
    }
  } else if (error.request) {
    // Request made but no response received
    logger.error("No response received from Hugging Face API", { error: error.message });
    return generateFallbackResponse(prompt); // Return fallback
  } else {
    // Error setting up the request
    throw new Error(`Error setting up request: ${error.message}`);
  }
}


// --- Core Service Functions ---

// Generic function to handle API calls with fallbacks
async function makeApiCallWithFallbacks(userId, apiKey, serviceType, payload, options) {
  const requestedModel = options.model || getRecommendedModels(serviceType)[0]; // Default to first recommended if none provided
  logger.info(`Initiating ${serviceType} with Hugging Face API`, {
    userId,
    requestedModel,
  });

  const allModels = [requestedModel, ...getRecommendedModels(serviceType)];
  const uniqueModels = [...new Set(allModels)]; // Ensure requested model is tried first, then unique fallbacks

  let lastError = null;

  for (const model of uniqueModels) {
    try {
      logger.debug(`Attempting to use model: ${model}`);
      const isAvailable = await checkModelAvailability(apiKey, model);
      if (!isAvailable) {
        logger.debug(`Model ${model} is unavailable or failed checks, trying next option`);
        continue; // Skip to the next model
      }

      const url = `${HF_API_URL}${model}`;
      const usedFallback = model !== requestedModel;

      if (usedFallback) {
        logger.info(`Using fallback model ${model} instead of ${requestedModel}`);
      }

      logger.debug(`Sending request to Hugging Face ${serviceType} API`, { model });

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000, // Increased timeout to 20 seconds
      });

      // Success
      logUsageToConsole(userId, serviceType, model);
      logger.debug(`${serviceType} successful with model ${model}`);

      // Return structured response including model info and fallback status
      return {
        data: response.data,
        model_used: model,
        fallback_used: usedFallback,
        notice: usedFallback
          ? `Note: The requested model "${requestedModel}" was unavailable. Used "${model}" instead.`
          : null,
      };

    } catch (error) {
      lastError = error; // Store the error in case all models fail
      logger.error(`Error with model ${model} during ${serviceType}:`, {
        error: error.message,
        status: error.response?.status,
        code: error.code,
      });
      // Don't throw here, continue to the next model
    }
  }

  // If loop completes, all models failed
  logger.error(`All models failed for ${serviceType}`, {
    userId,
    requestedModel,
    lastErrorMessage: lastError ? lastError.message : "No specific error captured",
  });

  // Handle the last error (might return a fallback response or throw)
  // Pass the original prompt/payload if needed for fallback generation context
  const promptForFallback = payload.inputs || payload.text || "";
  return handleApiError(lastError || new Error("All models failed"), promptForFallback);
}


// 1. Creative Text Generation
exports.generateCreativeText = async (userId, apiKey, prompt, options) => {
  const payload = {
    inputs: prompt,
    parameters: {
      max_length: options.maxLength || 150, // Increased default max_length
      temperature: options.temperature || 0.7,
      return_full_text: false, // Usually better for generation tasks
      num_return_sequences: 1,
      do_sample: true, // Ensure sampling for creativity
      top_k: 50,       // Add common sampling parameters
      top_p: 0.95,
    },
  };

  const result = await makeApiCallWithFallbacks(userId, apiKey, "text-generation", payload, options);

  // Check if handleApiError returned a fallback response directly
  if (result.model_used === "fallback") {
      return result;
  }

  // Process successful response
  let generatedText = "";
  if (result.data && result.data[0]) {
      generatedText = result.data[0].generated_text || result.data[0]; // Handle different possible response structures
  }

  const formattedMarkdown = processTextToMarkdown(generatedText, prompt);

  return {
    generated_text: generatedText,
    formatted_markdown: formattedMarkdown,
    model_used: result.model_used,
    fallback_used: result.fallback_used,
    notice: result.notice,
  };
};

// 2. Sentiment Analysis
exports.analyzeSentiment = async (userId, apiKey, text, options) => {
  const payload = {
    inputs: text,
  };

  const result = await makeApiCallWithFallbacks(userId, apiKey, "sentiment-analysis", payload, options);

  // Check if handleApiError returned a fallback response directly
  if (result.model_used === "fallback") {
      // Adapt fallback for sentiment analysis context if needed, or return as is
      return {
          sentiment_results: [],
          model_used: "fallback",
          fallback_used: true,
          notice: "Note: All sentiment analysis models are currently unavailable."
      };
  }

  // Process successful sentiment analysis response
  // The structure can vary, often it's an array of arrays like [[{label: 'POSITIVE', score: 0.99}]]
  let sentimentResults = [];
  if (result.data && Array.isArray(result.data) && Array.isArray(result.data[0])) {
      sentimentResults = result.data[0];
  } else if (result.data && Array.isArray(result.data)) {
      // Handle cases where it might be a flat array
      sentimentResults = result.data;
  }

  return {
    sentiment_results: sentimentResults, // Return the raw results
    model_used: result.model_used,
    fallback_used: result.fallback_used,
    notice: result.notice,
  };
};

// 3. Conversational Response
exports.conversationalResponse = async (userId, apiKey, message, options) => {
  const payload = {
    inputs: {
      text: message,
      past_user_inputs: options.past_user_inputs || [],
      generated_responses: options.generated_responses || [],
    },
     parameters: { // Add parameters for conversational models if needed
        min_length: options.minLength || 10,
        max_length: options.maxLength || 150,
        temperature: options.temperature || 0.8,
        top_k: 50,
        top_p: 0.9,
        repetition_penalty: 1.03, // Slightly discourage repetition
    }
  };

  // Ensure model is passed correctly if specified
  const modelOptions = { model: options.model };

  const result = await makeApiCallWithFallbacks(userId, apiKey, "conversation", payload, modelOptions);

  // Check if handleApiError returned a fallback response directly
  if (result.model_used === "fallback") {
      return result; // Return the standard fallback response
  }

  // Process successful conversational response
  let conversationResult = {};
  if (result.data) {
      conversationResult = result.data; // Usually contains 'generated_text', 'conversation', etc.
  }

  // Format the generated text part as markdown
  const generatedText = conversationResult.generated_text || "";
  const formattedMarkdown = processTextToMarkdown(generatedText, message); // Use user message as prompt context

  return {
    ...conversationResult, // Include all fields from the original response
    formatted_markdown: formattedMarkdown, // Add our formatted version
    model_used: result.model_used,
    fallback_used: result.fallback_used,
    notice: result.notice,
  };
};
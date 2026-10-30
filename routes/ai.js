const express = require('express');
const router = express.Router();

// Simple in-memory rate limiting map: ip -> lastRequestTimestamp
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 5000; // 5-second cooldown per client to prevent quota exhaustion

/**
 * POST /api/ai/generate-description
 * Practical 13: AI API Integration with Google Gemini
 * 
 * - Secure Server-Side Execution: Key stored only in process.env.GEMINI_API_KEY
 * - Graceful Degradation: If key is invalid or external API fails, returns fallback
 */
router.post('/generate-description', async (req, res) => {
  const { title } = req.body;

  // 1. Validate Input
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Task title is required to generate an AI description'
    });
  }

  const cleanTitle = title.trim();

  // 2. Supplementary Feature: Rate Limiting
  const clientIdentifier = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
  const now = Date.now();
  const lastRequestTime = rateLimitMap.get(clientIdentifier);

  if (lastRequestTime && (now - lastRequestTime < RATE_LIMIT_WINDOW_MS)) {
    const remainingSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastRequestTime)) / 1000);
    return res.status(429).json({
      success: false,
      error: `Rate limit reached. Please wait ${remainingSeconds} second(s) before requesting AI again.`
    });
  }
  rateLimitMap.set(clientIdentifier, now);

  const apiKey = process.env.GEMINI_API_KEY;

  // 3. Fallback generator function
  const generateFallback = (reason) => {
    return {
      success: true,
      description: `Plan, implement, and verify all necessary deliverables for "${cleanTitle}". Ensure comprehensive testing and quality checks.`,
      suggestedPriority: cleanTitle.toLowerCase().includes('urgent') || cleanTitle.toLowerCase().includes('fix') ? 'high' : 'medium',
      fallback: true,
      message: reason || 'AI service currently unavailable; offline fallback suggestion applied.'
    };
  };

  // If no API key configured, degrade gracefully immediately
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return res.status(200).json(generateFallback('GEMINI_API_KEY not configured in .env; generated deterministic fallback.'));
  }

  try {
    // 4. Secure call to Google Gemini REST API (gemini-1.5-flash / gemini-2.0-flash)
    const prompt = `You are a helpful task management assistant.
Write a concise, actionable, and professional task description (max 2-3 sentences) for a task titled: "${cleanTitle}".
Also suggest an appropriate priority: "low", "medium", or "high".

Respond ONLY with valid JSON in this exact structure:
{
  "description": "2-3 sentence task description here",
  "suggestedPriority": "low" | "medium" | "high"
}`;

    // Try gemini-flash-latest with fallback
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.warn(`[Practical 13] Gemini API returned HTTP ${response.status}:`, errorData);
      return res.status(200).json(generateFallback(`Google Gemini API responded with status ${response.status}. Fallback activated.`));
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean JSON response if enclosed in markdown code fences
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanedText);
      return res.status(200).json({
        success: true,
        description: parsed.description || cleanTitle,
        suggestedPriority: ['low', 'medium', 'high'].includes(parsed.suggestedPriority?.toLowerCase()) 
          ? parsed.suggestedPriority.toLowerCase() 
          : 'medium',
        fallback: false,
        model: 'gemini-1.5-flash'
      });
    } catch (parseErr) {
      // If LLM returned prose instead of valid JSON, use the raw text cleanly
      return res.status(200).json({
        success: true,
        description: cleanedText || cleanTitle,
        suggestedPriority: 'medium',
        fallback: false,
        model: 'gemini-1.5-flash'
      });
    }

  } catch (err) {
    // 5. Graceful Degradation on any network or timeout failure
    console.error('[Practical 13] AI Service failure caught in try/catch:', err.message);
    return res.status(200).json(generateFallback(`AI API request failed (${err.message}). Core application unaffected.`));
  }
});

module.exports = router;


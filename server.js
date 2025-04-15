const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const { GoogleGenerativeAI } = require("@google/generative-ai")
const path = require("path")

// Load environment variables
dotenv.config()

// Initialize Express app
const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

// Initialize Google Generative AI with the correct API key
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyB8umy7v6MGCDr3ARJc6vtN8AmQ0RyTU54"
const genAI = new GoogleGenerativeAI(apiKey)

// Available Gemini models to try
const GEMINI_MODELS = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"]

// Domain names mapping
const domainNames = {
  aiml: "Artificial Intelligence & Machine Learning",
  datascience: "Data Science",
  webdev: "Web Development",
  mobiledev: "Mobile Development",
  blockchain: "Blockchain",
  iot: "Internet of Things (IoT)",
  "ar-vr": "Augmented & Virtual Reality",
  cybersecurity: "Cybersecurity",
  gamedev: "Game Development",
  healthtech: "Health Technology",
}

// Helper function to try different Gemini models
async function tryGeminiModels(promptText) {
  let lastError = null

  // Try each model in order until one works
  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`Trying Gemini model: ${modelName}`)
      const model = genAI.getGenerativeModel({ model: modelName })

      const result = await model.generateContent(promptText)
      const response = await result.response
      const text = response.text()

      console.log(`Success with model: ${modelName}`)
      return { success: true, text, modelUsed: modelName }
    } catch (error) {
      console.error(`Error with model ${modelName}:`, error.message)
      lastError = error
      // Continue to the next model
    }
  }

  // If we get here, all models failed
  return { success: false, error: lastError, modelUsed: null }
}

// API endpoint to get project ideas for a domain
app.get("/api/project-ideas/:domain", async (req, res) => {
  try {
    const { domain } = req.params

    if (!domain || !domainNames[domain]) {
      return res.status(400).json({ error: "Invalid domain" })
    }

    const domainFullName = domainNames[domain]

    // Prepare prompt for Gemini
    const prompt = `Generate 10 unique and innovative hackathon project ideas for the ${domainFullName} domain. 
    Each idea should be creative, feasible for a hackathon, and include a brief description.
    Return them as a JSON array of strings, with each string being a project idea title and brief description (1-2 sentences).
    Format: ["Project 1: Brief description", "Project 2: Brief description", ...]. 
    Only return the JSON array, no other text.`

    // Try different Gemini models
    const result = await tryGeminiModels(prompt)

    if (result.success) {
      // Parse the response - handle both direct JSON and text that contains JSON
      let projectIdeas
      try {
        // Try parsing the entire response as JSON
        projectIdeas = JSON.parse(result.text)
      } catch (e) {
        // If that fails, try to extract JSON from the text
        const jsonMatch = result.text.match(/\[.*\]/s)
        if (jsonMatch) {
          projectIdeas = JSON.parse(jsonMatch[0])
        } else {
          // If no JSON found, split by newlines and clean up
          projectIdeas = result.text
            .split("\n")
            .filter((line) => line.trim().startsWith('"') || line.trim().startsWith('"'))
            .map((line) =>
              line
                .trim()
                .replace(/^"|"$|,$|^"|"$/g, "")
                .trim(),
            )
        }
      }

      // Ensure we have an array
      if (!Array.isArray(projectIdeas)) {
        projectIdeas = [result.text]
      }

      res.json({
        ideas: projectIdeas,
        modelUsed: result.modelUsed,
      })
    } else {
      // If all models failed, return an error
      res.status(500).json({
        error: "Failed to generate project ideas with Gemini API",
        details: result.error ? result.error.message : "Unknown error",
      })
    }
  } catch (error) {
    console.error("Error generating project ideas:", error)
    res.status(500).json({ error: "Failed to generate project ideas", details: error.message })
  }
})

// API endpoint to get project details
app.post("/api/project-details", async (req, res) => {
  try {
    const { domain, projectIdea, skillLevel, teamSize, duration } = req.body

    if (!domain || !projectIdea || !skillLevel || !teamSize || !duration) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    const domainFullName = domainNames[domain] || domain
    const isSolo = teamSize === "1"

    // Prepare prompt for Gemini
    const prompt = `Create a detailed hackathon project plan for the following:
    
    Project: ${projectIdea}
    Domain: ${domainFullName}
    Team Skill Level: ${skillLevel}
    Team Size: ${teamSize}
    Hackathon Duration: ${duration}
    
    Return the plan as a JSON object with the following structure:
    {
      "overview": {
        "description": "Project description",
        "keyFeatures": ["Feature 1", "Feature 2", ...]
      },
      "techStack": {
        "frontend": ["Technology 1: Description", "Technology 2: Description", ...],
        "backend": ["Technology 1: Description", "Technology 2: Description", ...],
        "tools": ["Tool 1: Description", "Tool 2: Description", ...]
      },
      "timeline": [
        {"phase": "Setup & Planning", "duration": "X hours", "tasks": ["Task 1", "Task 2", ...]},
        {"phase": "Core Development", "duration": "X hours", "tasks": ["Task 1", "Task 2", ...]},
        {"phase": "Polishing & Presentation", "duration": "X hours", "tasks": ["Task 1", "Task 2", ...]}
      ],
      "teamRoles": {
        "isSolo": ${isSolo},
        "soloAdvice": ["Advice 1", "Advice 2", ...],
        "roles": [
          {"title": "Role 1", "count": "X people", "responsibilities": ["Task 1", "Task 2", ...]},
          {"title": "Role 2", "count": "X people", "responsibilities": ["Task 1", "Task 2", ...]}
        ]
      }
    }
    
    Make sure the project plan is specific to the project idea and domain. Include relevant technologies, features, and tasks that make sense for this specific project. Only return the JSON object, no other text.`

    // Try different Gemini models
    const result = await tryGeminiModels(prompt)

    if (result.success) {
      // Parse the response
      let projectDetails
      try {
        projectDetails = JSON.parse(result.text)

        // Add the model used for debugging
        projectDetails.modelUsed = result.modelUsed

        res.json(projectDetails)
      } catch (error) {
        // If parsing fails, return the raw text
        return res.json({
          rawResponse: result.text,
          modelUsed: result.modelUsed,
          parsingError: error.message,
        })
      }
    } else {
      // If all models failed, return an error
      res.status(500).json({
        error: "Failed to generate project details with Gemini API",
        details: result.error ? result.error.message : "Unknown error",
      })
    }
  } catch (error) {
    console.error("Error generating project details:", error)
    res.status(500).json({ error: "Failed to generate project details", details: error.message })
  }
})

// Serve the main HTML file for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Using Gemini API key: ${apiKey.substring(0, 5)}...`)
  console.log(`Available models to try: ${GEMINI_MODELS.join(", ")}`)
})

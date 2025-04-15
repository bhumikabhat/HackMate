// DOM Elements
const themeToggle = document.getElementById("theme-toggle")
const generateBtn = document.getElementById("generate-btn")
const domainSelect = document.getElementById("domain-select")
const projectIdeasContainer = document.getElementById("project-ideas-container")
const projectIdeas = document.getElementById("project-ideas")
const skillLevel = document.getElementById("skill-level")
const teamSize = document.getElementById("team-size")
const hackathonDuration = document.getElementById("hackathon-duration")
const loadingSection = document.getElementById("loading")
const resultSection = document.getElementById("result-section")
const tabButtons = document.querySelectorAll(".tab-btn")
const tabContents = document.querySelectorAll(".tab-content")
const copyBtn = document.getElementById("copy-btn")
const userProfile = document.getElementById("user-profile")
const userImage = document.getElementById("user-image")
const userName = document.getElementById("user-name")
const signOutBtn = document.getElementById("sign-out")

// Theme Toggle Functionality
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode")
  document.body.classList.toggle("light-mode")

  // Save theme preference to localStorage
  const currentTheme = document.body.classList.contains("dark-mode") ? "dark" : "light"
  localStorage.setItem("theme", currentTheme)
})

// Load saved theme from localStorage
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme")
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode")
    document.body.classList.remove("light-mode")
  }

  // Load user data if exists
  const userData = JSON.parse(localStorage.getItem("userData"))
  if (userData) {
    showUserProfile(userData)
  }

  // Create refresh button
  createRefreshButton()
})

// Create refresh button
function createRefreshButton() {
  const refreshIdeasBtn = document.createElement("button")
  refreshIdeasBtn.id = "refresh-ideas-btn"
  refreshIdeasBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Ideas'
  refreshIdeasBtn.className = "refresh-btn"
  refreshIdeasBtn.style.marginTop = "0.5rem"
  refreshIdeasBtn.style.display = "none"

  // Add the refresh button after the project ideas dropdown
  projectIdeasContainer.appendChild(refreshIdeasBtn)

  // Refresh button click handler
  refreshIdeasBtn.addEventListener("click", async () => {
    const selectedDomain = domainSelect.value
    if (selectedDomain) {
      refreshIdeasBtn.disabled = true
      refreshIdeasBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...'

      await fetchProjectIdeas(selectedDomain)

      refreshIdeasBtn.disabled = false
      refreshIdeasBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Ideas'
    }
  })
}

// Function to fetch project ideas
async function fetchProjectIdeas(domain) {
  try {
    // Show loading state for project ideas only
    const refreshBtn = document.getElementById("refresh-ideas-btn")
    if (refreshBtn) {
      refreshBtn.style.display = "none"
    }

    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime()
    const response = await fetch(`/api/project-ideas/${domain}?t=${timestamp}`)
    const data = await response.json()

    if (data.ideas && data.ideas.length > 0) {
      // Clear previous options
      projectIdeas.innerHTML = '<option value="" disabled selected>Choose a project idea...</option>'

      // Add new options based on API response
      data.ideas.forEach((idea, index) => {
        const option = document.createElement("option")
        option.value = idea
        option.textContent = idea
        projectIdeas.appendChild(option)
      })

      // Show project ideas dropdown
      projectIdeasContainer.classList.remove("hidden")

      // Show refresh button
      const refreshBtn = document.getElementById("refresh-ideas-btn")
      if (refreshBtn) {
        refreshBtn.style.display = "block"
      }

      // Log the model used (for debugging)
      if (data.modelUsed) {
        console.log(`Ideas generated using model: ${data.modelUsed}`)
      }
    } else {
      alert("No project ideas found for this domain. Please try again.")
    }
  } catch (error) {
    console.error("Error fetching project ideas:", error)
    alert("Failed to fetch project ideas. Please try again.")
  }
}

// Domain selection change handler
domainSelect.addEventListener("change", async () => {
  const selectedDomain = domainSelect.value

  if (selectedDomain) {
    await fetchProjectIdeas(selectedDomain)
  } else {
    projectIdeasContainer.classList.add("hidden")
    const refreshBtn = document.getElementById("refresh-ideas-btn")
    if (refreshBtn) {
      refreshBtn.style.display = "none"
    }
  }
})

// Tab Functionality
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remove active class from all buttons and contents
    tabButtons.forEach((btn) => btn.classList.remove("active"))
    tabContents.forEach((content) => content.classList.remove("active"))

    // Add active class to clicked button and corresponding content
    button.classList.add("active")
    const tabId = button.getAttribute("data-tab")
    document.getElementById(tabId).classList.add("active")
  })
})

// Generate Plan Button Click
generateBtn.addEventListener("click", async () => {
  // Validate input
  if (!domainSelect.value) {
    alert("Please select a domain.")
    return
  }

  if (!projectIdeas.value) {
    alert("Please select a project idea.")
    return
  }

  // Show loading state
  loadingSection.classList.remove("hidden")
  resultSection.classList.add("hidden")

  try {
    // Call API to get project details
    const response = await fetch("/api/project-details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: domainSelect.value,
        projectIdea: projectIdeas.value,
        skillLevel: skillLevel.value,
        teamSize: teamSize.value,
        duration: hackathonDuration.value,
      }),
    })

    const data = await response.json()

    // Log the model used (for debugging)
    if (data.modelUsed) {
      console.log(`Project details generated using model: ${data.modelUsed}`)
    }

    // Populate result tabs with data
    if (data.rawResponse) {
      // Try to parse the raw response if possible
      try {
        const parsedData = JSON.parse(data.rawResponse)
        populateResults(parsedData)
      } catch (e) {
        console.error("Failed to parse raw response:", e)

        // If parsing fails, try to extract JSON from the text
        try {
          const jsonMatch = data.rawResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsedData = JSON.parse(jsonMatch[0])
            populateResults(parsedData)
          } else {
            // If no JSON found, display raw text in overview tab only
            document.getElementById("overview").innerHTML = `<pre class="raw-response">${data.rawResponse}</pre>`
            document.getElementById("tech-stack").innerHTML =
              `<div class="result-section-content"><p class="no-data-message">Tech stack information not available in structured format.</p></div>`
            document.getElementById("timeline").innerHTML =
              `<div class="result-section-content"><p class="no-data-message">Timeline information not available in structured format.</p></div>`
            document.getElementById("team-roles").innerHTML =
              `<div class="result-section-content"><p class="no-data-message">Team roles information not available in structured format.</p></div>`
          }
        } catch (jsonError) {
          // If all parsing fails, display raw text in overview tab only
          document.getElementById("overview").innerHTML = `<pre class="raw-response">${data.rawResponse}</pre>`
          document.getElementById("tech-stack").innerHTML =
            `<div class="result-section-content"><p class="no-data-message">Tech stack information not available in structured format.</p></div>`
          document.getElementById("timeline").innerHTML =
            `<div class="result-section-content"><p class="no-data-message">Timeline information not available in structured format.</p></div>`
          document.getElementById("team-roles").innerHTML =
            `<div class="result-section-content"><p class="no-data-message">Team roles information not available in structured format.</p></div>`
        }
      }
    } else {
      populateResults(data)
    }

    // Hide loading and show results
    loadingSection.classList.add("hidden")
    resultSection.classList.remove("hidden")

    // Scroll to results
    resultSection.scrollIntoView({ behavior: "smooth" })

    // Make sure the overview tab is active
    tabButtons.forEach((btn) => btn.classList.remove("active"))
    tabContents.forEach((content) => content.classList.remove("active"))
    document.querySelector('.tab-btn[data-tab="overview"]').classList.add("active")
    document.getElementById("overview").classList.add("active")
  } catch (error) {
    console.error("Error generating plan:", error)
    loadingSection.classList.add("hidden")
    alert("An error occurred while generating your plan. Please try again.")
  }
})

// Copy Button Functionality
copyBtn.addEventListener("click", () => {
  // Get all content from all tabs
  const allContent = Array.from(tabContents)
    .map((tab) => {
      const tabName = tab.id.charAt(0).toUpperCase() + tab.id.slice(1)
      const tabContent = tab.textContent.trim()
      return `${tabName}:\n${tabContent}`
    })
    .join("\n\n")

  navigator.clipboard
    .writeText(allContent)
    .then(() => {
      // Show temporary success message
      const originalText = copyBtn.innerHTML
      copyBtn.innerHTML = '<i class="fas fa-check"></i>'
      setTimeout(() => {
        copyBtn.innerHTML = originalText
      }, 2000)
    })
    .catch((err) => {
      console.error("Failed to copy text:", err)
    })
})

// Google Sign-In Functionality
function handleCredentialResponse(response) {
  // Decode the JWT token to get user info
  const responsePayload = decodeJwtResponse(response.credential)

  const userData = {
    name: responsePayload.name,
    email: responsePayload.email,
    picture: responsePayload.picture,
  }

  // Save user data to localStorage
  localStorage.setItem("userData", JSON.stringify(userData))

  // Show user profile
  showUserProfile(userData)
}

function decodeJwtResponse(token) {
  // Simple JWT decoder (for demo purposes)
  const base64Url = token.split(".")[1]
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  )

  return JSON.parse(jsonPayload)
}

function showUserProfile(userData) {
  // Hide Google sign-in button and show user profile
  const googleSignIn = document.querySelector(".g_id_signin")
  if (googleSignIn) googleSignIn.style.display = "none"

  // Update user profile
  userImage.src = userData.picture
  userName.textContent = userData.name
  userProfile.classList.remove("hidden")
}

// Sign Out Functionality
signOutBtn.addEventListener("click", () => {
  // Clear user data from localStorage
  localStorage.removeItem("userData")

  // Hide user profile and show Google sign-in button
  userProfile.classList.add("hidden")
  const googleSignIn = document.querySelector(".g_id_signin")
  if (googleSignIn) googleSignIn.style.display = "block"
})

// Populate Results with Project Data
function populateResults(data) {
  // Overview Tab - ONLY contains overview information
  if (data.overview) {
    document.getElementById("overview").innerHTML = `
      <div class="result-section-content">
        <h3 class="result-section-title">Project Overview</h3>
        <div class="result-description">
          <p>${data.overview.description}</p>
        </div>
        <h4 class="result-subsection-title">Key Features</h4>
        <ul class="feature-list">
          ${data.overview.keyFeatures.map((feature) => `<li>${feature}</li>`).join("")}
        </ul>
      </div>
    `
  } else {
    document.getElementById("overview").innerHTML = `
      <div class="result-section-content">
        <p class="no-data-message">Overview information not available.</p>
      </div>
    `
  }

  // Tech Stack Tab - ONLY contains tech stack information
  if (data.techStack) {
    document.getElementById("tech-stack").innerHTML = `
      <div class="result-section-content">
        <h3 class="result-section-title">Recommended Tech Stack</h3>
        <div class="tech-category">
          <h4 class="result-subsection-title">Frontend</h4>
          <ul class="tech-list">
            ${data.techStack.frontend.map((tech) => `<li>${tech}</li>`).join("")}
          </ul>
        </div>
        <div class="tech-category">
          <h4 class="result-subsection-title">Backend</h4>
          <ul class="tech-list">
            ${data.techStack.backend.map((tech) => `<li>${tech}</li>`).join("")}
          </ul>
        </div>
        <div class="tech-category">
          <h4 class="result-subsection-title">Tools & Deployment</h4>
          <ul class="tech-list">
            ${data.techStack.tools.map((tool) => `<li>${tool}</li>`).join("")}
          </ul>
        </div>
      </div>
    `
  } else {
    document.getElementById("tech-stack").innerHTML = `
      <div class="result-section-content">
        <p class="no-data-message">Tech stack information not available.</p>
      </div>
    `
  }

  // Timeline Tab - ONLY contains timeline information
  if (data.timeline) {
    document.getElementById("timeline").innerHTML = `
      <div class="result-section-content">
        <h3 class="result-section-title">Project Timeline</h3>
        <div class="timeline">
          ${data.timeline
            .map(
              (phase) => `
            <div class="timeline-item">
              <h4 class="timeline-phase">${phase.phase}: ${phase.duration}</h4>
              <ul class="timeline-tasks">
                ${phase.tasks.map((task) => `<li>${task}</li>`).join("")}
              </ul>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `
  } else {
    document.getElementById("timeline").innerHTML = `
      <div class="result-section-content">
        <p class="no-data-message">Timeline information not available.</p>
      </div>
    `
  }

  // Team Roles Tab - ONLY contains team roles information
  if (data.teamRoles) {
    if (data.teamRoles.isSolo) {
      document.getElementById("team-roles").innerHTML = `
        <div class="result-section-content">
          <h3 class="result-section-title">Team Roles & Responsibilities</h3>
          <div class="solo-advice">
            <p>As a solo developer, you'll need to handle all aspects of the project. Here's a suggested approach:</p>
            <ul class="advice-list">
              ${data.teamRoles.soloAdvice.map((advice) => `<li>${advice}</li>`).join("")}
            </ul>
          </div>
        </div>
      `
    } else {
      document.getElementById("team-roles").innerHTML = `
        <div class="result-section-content">
          <h3 class="result-section-title">Team Roles & Responsibilities</h3>
          <div class="roles">
            ${data.teamRoles.roles
              .map(
                (role) => `
              <div class="role-item">
                <h4 class="role-title">${role.title} (${role.count})</h4>
                <ul class="role-responsibilities">
                  ${role.responsibilities.map((resp) => `<li>${resp}</li>`).join("")}
                </ul>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `
    }
  } else {
    document.getElementById("team-roles").innerHTML = `
      <div class="result-section-content">
        <p class="no-data-message">Team roles information not available.</p>
      </div>
    `
  }
}

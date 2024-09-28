let words = []
let currentIndex = 0
let cooldownActive = false
let cooldownDuration = 10000 // 10 seconds in milliseconds
let isTimerMode = false
let isAutoPlayMode = false
let autoPlayTimeout
let progressInterval

async function loadWords() {
    try {
        document.getElementById("word").textContent = "Loading..."
        const csvPath = basePath + "/dictionary.csv"
        console.log("Loading dictionary from:", csvPath)
        const response = await fetch(csvPath)
        const csvText = await response.text()
        wordsData = csvText.split("\n").map((line) => {
            const [word, type, definition] = line.split(",").map((str) => {
                return str.replace(/"/g, "").replace(/\n/g, "")
            })
            return { word, type, definition }
        })
        words = wordsData
    } catch (error) {
        console.error("Error loading dictionary:", error)
        return
    }
    currentIndex = parseInt(localStorage.getItem("currentWordIndex") || "0")
    displayWord()
}

function displayWord() {
    const currentWord = words[currentIndex]
    document.getElementById("word").textContent =
        '"' + currentWord.word + '"' || ""
    document.getElementById("definition").textContent =
        currentWord.definition || ""
    localStorage.setItem("currentWordIndex", currentIndex.toString())

    if (isTimerMode || isAutoPlayMode) {
        startCooldown()
    }
}

function startCooldown() {
    if (progressInterval) {
        clearInterval(progressInterval)
    }

    cooldownActive = true
    updateInteractionState(true)
    const progressBar = document.getElementById("progressBar")
    const card = document.getElementById("card")

    card.classList.add("timer-active")
    progressBar.style.width = "100%"
    progressBar.style.display = "block"

    let timeLeft = cooldownDuration
    const interval = 100 // Update every 100ms for smoother animation

    progressInterval = setInterval(() => {
        timeLeft -= interval
        const progress = (timeLeft / cooldownDuration) * 100
        progressBar.style.width = `${progress}%`

        if (timeLeft <= 0) {
            clearInterval(progressInterval)
            cooldownActive = false
            updateInteractionState(false)
            progressBar.style.width = "0%"
            progressBar.style.display = "none"
            card.classList.remove("timer-active")

            if (isAutoPlayMode) {
                handleNext()
            }
        }
    }, interval)

    if (isAutoPlayMode) {
        clearTimeout(autoPlayTimeout)
        autoPlayTimeout = setTimeout(handleNext, cooldownDuration)
    }
}

function updateInteractionState(disabled) {
    document.getElementById("prevBtn").disabled = disabled
    document.getElementById("nextBtn").disabled = disabled
    document.getElementById("searchBtn").disabled = disabled
    document.getElementById("searchInput").disabled = disabled
    document.getElementById("blurOverlay").classList.toggle("active", disabled)

    // Always show the stop button during auto-play, regardless of the disabled state
    document.getElementById("stopBtn").style.display = isAutoPlayMode
        ? "block"
        : "none"
}

function handleNext() {
    if (!cooldownActive || isAutoPlayMode) {
        currentIndex = (currentIndex + 1) % words.length
        displayWord()
    }
}

function handlePrevious() {
    if (!cooldownActive || isAutoPlayMode) {
        currentIndex = (currentIndex - 1 + words.length) % words.length
        displayWord()
    }
}

function handleSearch() {
    if (cooldownActive && !isAutoPlayMode) return

    const searchTerm = document
        .getElementById("searchInput")
        .value.toLowerCase()
    let bestMatch = null
    let bestScore = -Infinity

    words.forEach((wordObj, index) => {
        const word = wordObj.word.toLowerCase()
        let score

        if (word === searchTerm) {
            score = Infinity
        } else if (word.startsWith(searchTerm)) {
            score = 100 + searchTerm.length / word.length
        } else if (word.includes(searchTerm)) {
            score = 10 + searchTerm.length / word.length
        } else {
            const distance = levenshteinDistance(word, searchTerm)
            if (distance <= 3) {
                score = 1 + 1 / (distance + 1)
            } else {
                score = -Infinity
            }
        }

        if (score > bestScore) {
            bestScore = score
            bestMatch = { index, word: wordObj.word }
        }
    })

    if (bestMatch) {
        currentIndex = bestMatch.index
        displayWord()
        document.getElementById("searchInput").value = ""
        if (bestScore === Infinity) {
            console.log("Exact match found!")
        } else {
            console.log("Best partial match found.")
        }
    } else {
        alert("No matching word found in dictionary")
    }
}

function levenshteinDistance(a, b) {
    const matrix = []

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i]
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                )
            }
        }
    }

    return matrix[b.length][a.length]
}

function stopAutoPlay() {
    isAutoPlayMode = false
    cooldownActive = false
    clearTimeout(autoPlayTimeout)
    clearInterval(progressInterval)
    updateInteractionState(false)
    const progressBar = document.getElementById("progressBar")
    progressBar.style.width = "0%"
    progressBar.style.display = "none"
    document.getElementById("card").classList.remove("timer-active")
    document.getElementById("stopBtn").style.display = "none"
    document.querySelector('input[name="mode"][value="normal"]').checked = true
}

function startAutoPlay() {
    isAutoPlayMode = true
    updateInteractionState(true)
    displayWord()
}

function handleModeChange(event) {
    const newMode = event.target.value

    // If switching to the same mode, do nothing
    if (
        (newMode === "timer" && isTimerMode) ||
        (newMode === "autoplay" && isAutoPlayMode)
    ) {
        return
    }

    isTimerMode = newMode === "timer"
    isAutoPlayMode = newMode === "autoplay"

    // Stop any ongoing cooldown or auto-play
    clearTimeout(autoPlayTimeout)
    clearInterval(progressInterval)

    if (isTimerMode || isAutoPlayMode) {
        displayWord() // This will start the cooldown for timer or auto-play mode
    } else {
        stopAutoPlay() // This handles resetting everything for normal mode
    }
}

// Touch events for mobile swipe
let touchStartX = 0
let touchEndX = 0

function handleTouchStart(event) {
    touchStartX = event.touches[0].clientX
}

function handleTouchMove(event) {
    touchEndX = event.touches[0].clientX
}

function handleTouchEnd() {
    if (!cooldownActive || isAutoPlayMode) {
        const swipeThreshold = 50 // minimum distance for a swipe
        if (touchStartX - touchEndX > swipeThreshold) {
            // Swipe left
            handleNext()
        } else if (touchEndX - touchStartX > swipeThreshold) {
            // Swipe right
            handlePrevious()
        }
    }
    // Reset values
    touchStartX = 0
    touchEndX = 0
}

document.getElementById("nextBtn").addEventListener("click", handleNext)
document.getElementById("prevBtn").addEventListener("click", handlePrevious)
document.getElementById("searchBtn").addEventListener("click", handleSearch)
document.getElementById("stopBtn").addEventListener("click", stopAutoPlay)
document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", handleModeChange)
})

const card = document.getElementById("card")
card.addEventListener("touchstart", handleTouchStart)
card.addEventListener("touchmove", handleTouchMove)
card.addEventListener("touchend", handleTouchEnd)

loadWords()

document.onkeydown = function (e) {
    if (e.key === "Escape" && isAutoPlayMode) {
        stopAutoPlay()
    } else if (!cooldownActive || isAutoPlayMode) {
        if (e.key === "ArrowLeft") {
            handlePrevious()
        } else if (e.key === "ArrowRight") {
            handleNext()
        }
    }
}

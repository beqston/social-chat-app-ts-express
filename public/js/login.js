const errorMessage = document.getElementById("error-message");

async function postLogin(event) {
    event.preventDefault(); // prevent form from reloading the page

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Client-side validation
    if (!username || !password) {
        errorMessage.style.display = "block";
        errorMessage.textContent = "Please fill in all fields.";
        return;
    }

    try {
        const res = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({})); // await was missing
            throw new Error(error.message || "Something went wrong. Please try again.");
        }

        // Success — redirect 
        window.location.href = "/";

    } catch (error) {
        errorMessage.style.display = "block";
        errorMessage.textContent = error.message; // error.message, not just error
    }
}

document.querySelector(".form").addEventListener("submit", postLogin);
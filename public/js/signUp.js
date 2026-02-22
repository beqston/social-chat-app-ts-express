const signUpForm = document.getElementById("sign-up");
const toastModal = document.getElementById("toast-modal");

function callToastModal(message){
    toastModal.style.display="block";
    toastModal.textContent=message;

    setTimeout(()=>{
        toastModal.style.display="none";
    }, 3000);
};

signUpForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    try {
        const res = await fetch("/add-user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: 'include',
            body: JSON.stringify({ username, email, password, confirmPassword })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || data.errors?.[0]?.msg || "Registration failed!");
        }

        callToastModal("User created successfully!");
        setTimeout(()=>{
            signUpForm.reset();
            window.location.href="/"
        }, 3000)

    } catch (err) {
        toastModal.style.color="red";
        callToastModal(err.message);
    }
});

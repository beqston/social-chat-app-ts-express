const profileCNT = document.getElementById("profile");
const toastModal = document.getElementById("toast-modal");
const deleteModal = document.getElementById("delete-modal");
const closeModal = document.getElementById("close-modal");
const deleteProfile = document.getElementById("delete-profile");

function callToastModal(message, isError = false) {
    toastModal.style.display = "block";
    toastModal.textContent = message;
    toastModal.style.backgroundColor = isError ? "#ff4d4d" : "#4CAF50";

    setTimeout(() => {
        toastModal.style.display = "none";
    }, 3000);
}

async function getProfile() {
    try {
        profileCNT.innerHTML = "<p>Loading profile...</p>";
        
        const [resMe, resUsers] = await Promise.all([
            fetch("/api/v1/me"),
            fetch("/api/v1/users")
        ]);

        if (!resMe.ok || !resUsers.ok) throw new Error("Could not fetch user data");

        const userId = await resMe.json();
        const users = await resUsers.json();
        const user = users.data.find((u) => u._id == userId);

        if (!user) return alert("User Not Found");

        profileCNT.innerHTML = `
            <div id="profile-details-cnt">
                <div class="username-email">
                    <div class="profile-img-container" style="position: relative; cursor: pointer;">
                        ${user.image 
                            ? `<img src="${user.image}" id="avatar-preview" class="profile-img">` 
                            : `<div class="profile-img" id="avatar-preview">${user.username[0].toUpperCase()}</div>`
                        }
                        <div class="edit-overlay" style="color:white;">Change Photo</div>
                        <input type="file" id="imageInput" accept="image/*" style="display:none">
                    </div>
                    <div class="user-details-cnt">
                        <h2>${user.username}</h2>
                        <h2>${user.email}</h2>
                    </div>
                    
                    ${user.image ? `<div id="remove-image-cnt"><button id="remove-image">Remove Photo</button></div>` : ``}
                </div>
            
                <form id="passwordForm">
                    <input type="password" id="password" placeholder="New Password" required>
                    <input type="password" id="confirmPassword" placeholder="Confirm Password" required>
                    <div><button type="submit">Update Password</button></div>
                </form>

                <button id="delete-btn" class="danger-btn">Delete Profile</button>
            </div>
        `;

        handleUploadImage();
        handleChangePassword(user._id);
        handleDeleteUser(user._id);
        if (user.image) {
            handleDeleteProfileImage();
        }
    } catch (err) {
        console.error(err);
        profileCNT.innerHTML = "<p>Error loading profile.</p>";
    }
}

function handleUploadImage() {
    const imgContainer = document.querySelector(".profile-img-container");
    const imageInput = document.getElementById("imageInput");

    imgContainer.onclick = () => imageInput.click();

    imageInput.onchange = async () => {
        const file = imageInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById("avatar-preview");
            if (preview && preview.tagName === "IMG") {
                preview.src = e.target.result;
            } else {
                preview.outerHTML = `<img src="${e.target.result}" id="avatar-preview" class="profile-img">`;
            }
        };
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append("image", file);

        try {
            const res = await fetch("/upload/profile-image", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Upload failed");

            // Add "Remove Photo" button if it doesn't exist yet
            if (!document.getElementById("remove-image")) {
                const usernameEmail = document.querySelector(".username-email");
                const div = document.createElement("div");
                div.id = "remove-image-cnt";
                div.innerHTML = `<button id="remove-image">Remove Photo</button>`;
                usernameEmail.appendChild(div);
                handleDeleteProfileImage();
            }

            callToastModal("Profile picture updated!");
        } catch (err) {
            callToastModal(err.message, true);
        }
    };
}

function handleChangePassword(userId) {
    const passwordForm = document.getElementById("passwordForm");
    passwordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        try {
            const res = await fetch(`/user/update-password/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, confirmPassword })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Update failed");

            passwordForm.reset();
            callToastModal("Password updated successfully!");
        } catch (err) {
            callToastModal(err.message, true);
        }
    });
}

function handleDeleteUser(userId) {
    document.getElementById("delete-btn").onclick = () => deleteModal.style.display = "grid";
    closeModal.onclick = () => deleteModal.style.display = "none";

    deleteProfile.onclick = async () => {
        try {
            const res = await fetch(`/user/delete-profile/${userId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete profile");

            callToastModal("Profile deleted. Redirecting...");
            setTimeout(() => window.location.href = "/login", 2000);
        } catch (err) {
            callToastModal(err.message, true);
        }
    };
}

function handleDeleteProfileImage() {
    const removeImage = document.getElementById("remove-image");

    removeImage.onclick = async () => {
        try {
            const res = await fetch(`/delete/profile-image`, { method: "DELETE", credentials: "include" });
            if (!res.ok) throw new Error("Failed to delete image");

            // Replace <img> with letter avatar
            const preview = document.getElementById("avatar-preview");
            const username = document.querySelector(".user-details-cnt h2").textContent;
            preview.outerHTML = `<div class="profile-img" id="avatar-preview">${username[0].toUpperCase()}</div>`;

            // Remove the "Remove Photo" button
            const removeImageCnt = document.getElementById("remove-image-cnt");
            if (removeImageCnt) removeImageCnt.remove();

            callToastModal("Profile photo deleted successfully");
        } catch (err) {
            callToastModal(err.message, true);
        }
    };
}

getProfile();
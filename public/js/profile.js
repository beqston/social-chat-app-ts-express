const profileCNT = document.getElementById("profile");
const toastModal = document.getElementById("toast-modal");
const deleteModal = document.getElementById("delete-modal");
const closeModal = document.getElementById("close-modal");
const deleteProfile = document.getElementById("delete-profile");

function callToastModal(message){
    toastModal.style.display="block";
    toastModal.textContent=message;

    setTimeout(()=>{
        toastModal.style.display="none";
    }, 3000);
}


async function getProfile() {
    try{
        profileCNT.innerHTML = "";
        const resMe = await fetch("/api/v1/me");

        if(!resMe.ok){
            return alert("User Not Fount");
        }

        const userId = await resMe.json();
        const resUsers = await fetch("/api/v1/users");

        if(!resUsers.ok){
            return alert("User Not Found!")
        }

        const users = await resUsers.json();
        const user = users.data.find((user)=> user._id == userId);

        // profile details main container
        profileCNT.innerHTML= `
            <div id="profile-details-cnt">

                <div class="username-email">
                    <div class="profile-img">${user.username[0].toUpperCase()}</div>
                    <div>
                        <h2>${user.username}</h2>
                        <h2>${user.email}</h2>
                    </div>
                </div>
            
                <form id="passwordForm">
                    <input type="password" name="password" id="password" placeholder="Password">
                    <input type="password" name="confirmPassword" id="confirmPassword" placeholder="Confirm Password">
                    <div><button type="submit">Update Password</button></div>
                </form>
                <button id="delete-btn">Delete Profile</button>
            </div>

        `
        // update password logic
        const passwordForm = document.getElementById("passwordForm");
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const passwordInput = document.getElementById("password");
            const confirmPasswordInput = document.getElementById("confirmPassword");
            
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            try {
                const res = await fetch(`/user/update-password/${user._id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials:"include",
                body: JSON.stringify({ password, confirmPassword })
                });

                if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.message || "Error updating password");
                };

                
                passwordInput.value = "";
                confirmPasswordInput.value = "";
                callToastModal("Password updated successfully!");

            } catch (error) {
                callToastModal(error.message)
                toastModal.style.color="red";
            }
        });

        // delete profile logic
        const deleteButton = document.getElementById("delete-btn");
        // show delete modal
        deleteButton.onclick=()=>{
            deleteModal.style.display="grid"
        };
        // close delete modal
        closeModal.onclick = ()=>{
            deleteModal.style.display="none"
        };

        deleteProfile.addEventListener("click", async()=>{
            try {
            const resDeleteUser = await fetch(`/user/delete-profile/${user._id}`, {method:"DELETE"});
            if(!resDeleteUser.ok){
                const error = resDeleteUser.json().catch(()=>({}));
                throw new Error (error || "You have error, not deleted user!!")
            }

            callToastModal("User Deleded successfully!!");
            setTimeout(()=>{
                window.location.href="/login";
            }, 3000);

            } catch (err) {
                callToastModal(err.message)
            }
        })
    }catch(err){
        console.log(err)
    }
}

getProfile()

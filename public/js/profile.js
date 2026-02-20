const profileCNT = document.getElementById("profile");

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
            
                <form action="/">
                    <input type="password" name="password" id="password" placeholder="Password">
                    <input type="password" name="confirmPassword" id="confirmPassword" placeholder="Confirm Password">
                    <div><button>Update Password</button></div>
                </form>
               
            </div>

        `

    }catch(err){
        console.log(err)
    }
}

getProfile()

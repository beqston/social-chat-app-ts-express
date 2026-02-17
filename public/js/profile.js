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
        console.log(user)

        

        profileCNT.innerHTML= `
            <h2>${user.username}</h2>
            <h2>${user.email}</h2>
        `

    }catch(err){
        console.log(err)
    }
}

getProfile()
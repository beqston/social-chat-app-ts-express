const imageInput = document.getElementById("image");
const previewImg = document.getElementById("show-image-previw");
const previewWrapper = document.getElementById("preview-wrapper");
const removeBtn = document.getElementById("remove-img-btn");

imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (file) {
        // Create a temporary URL for the image
        const reader = new URL(URL.createObjectURL(file));
        
        previewImg.src = reader;
        previewWrapper.style.display = "block";
    }
});

// Clear the image if the user clicks the "X"
removeBtn.addEventListener("click", () => {
    imageInput.value = ""; // Clear the input
    previewWrapper.style.display = "none";
    previewImg.src = "";
});

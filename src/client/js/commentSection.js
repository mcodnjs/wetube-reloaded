const videoContainer = document.getElementById("videoContainer");
const form = document.getElementById("commentForm");

const videoComment = document.getElementById("videoComment");
const commentContainer = videoComment.querySelectorAll("li.video__comment");
const commentDelete = videoComment.querySelectorAll("span.comment__delete");

const addComment = (text, id) => {
    const videoComments = document.querySelector(".video__comments ul");
    const newComment = document.createElement("li");
    newComment.className = "video__comment";
    newComment.dataset.id = id;
    const icon = document.createElement("i");
    icon.className = "fas fa-comment";
    const span = document.createElement("span");
    span.innerText = ` ${text}`;
    const span2 = document.createElement("span");
    span2.className = "comment__delete";
    span2.dataset.id = id;
    span2.innerText = "❌";
    span2.style.float = "right";
    newComment.appendChild(icon);
    newComment.appendChild(span);
    newComment.appendChild(span2);
    videoComments.prepend(newComment);
    span2.addEventListener("click", handleDelete);
};

const deleteComment = (id) => {

    const videoComment = document.getElementById("videoComment");
    const commentContainer = videoComment.querySelectorAll("li.video__comment");
    commentContainer.forEach( (comment) => {
        if(comment.dataset.id === id) {
            comment.remove();
        }
    });
};

const handleDelete = async (event) => {

    console.log(event);
    event.preventDefault();
    const commentId = event.target.dataset.id;
    console.log("delete:", commentId);

    const response = await fetch(`/api/comments/${commentId}/comment`, {
        method: "DELETE",
    });
    console.log(response);

    if(response.status === 201) {
        deleteComment(commentId);
    }
};

const handleSubmit = async (event) => {
    
    event.preventDefault();
    const textarea = form.querySelector("textarea");
    const text = textarea.value;
    const videoId = videoContainer.dataset.id;

    if( text === "") {
        return ;
    }

    const response = await fetch(`/api/videos/${videoId}/comment`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
          },
        body: JSON.stringify({ text }),
    });
    
    if(response.status === 201) {
        textarea.value = "";
        const {newCommentId} = await response.json();
        addComment(text, newCommentId);
    }  
};

if(form) {
    form.addEventListener("submit", handleSubmit);
}

commentDelete.forEach( (comment) => {
    comment.addEventListener("click", handleDelete);
});
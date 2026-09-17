/*==================================================
SIVEXO SOFT MAIN JAVASCRIPT
==================================================*/


document.addEventListener("DOMContentLoaded", () => {



/*==================================================
MOBILE MENU
==================================================*/


const menuBtn = document.querySelector(".menu-btn");

const navMenu = document.querySelector(".nav-menu");


if(menuBtn && navMenu){


menuBtn.addEventListener("click",()=>{


navMenu.classList.toggle("active");


menuBtn.classList.toggle("active");


});



}





// Close mobile menu after clicking link


document.querySelectorAll(".nav-menu a")
.forEach(link=>{


link.addEventListener("click",()=>{


if(navMenu){

navMenu.classList.remove("active");

}


});


});









/*==================================================
STICKY HEADER EFFECT
==================================================*/


const header = document.querySelector(".header");



window.addEventListener("scroll",()=>{


if(!header) return;



if(window.scrollY > 50){


header.classList.add("scrolled");


header.style.background =
"rgba(9,9,11,.95)";



}

else{


header.classList.remove("scrolled");


header.style.background =
"rgba(9,9,11,.65)";


}



});









/*==================================================
ACTIVE NAVIGATION
==================================================*/


let currentPage =
window.location.pathname.split("/").pop();



if(currentPage === ""){

currentPage="index.html";

}



document.querySelectorAll(".nav-menu a")
.forEach(link=>{


let href =
link.getAttribute("href");



if(href === currentPage){


link.classList.add("active");


}



});










/*==================================================
SCROLL TO TOP BUTTON
==================================================*/


const scrollBtn =
document.querySelector(".scroll-top");



if(scrollBtn){


window.addEventListener("scroll",()=>{


if(window.scrollY > 500){


scrollBtn.style.opacity="1";

scrollBtn.style.visibility="visible";


}

else{


scrollBtn.style.opacity="0";

scrollBtn.style.visibility="hidden";


}


});





scrollBtn.addEventListener("click",(e)=>{


e.preventDefault();


window.scrollTo({

top:0,

behavior:"smooth"

});


});


}










/*==================================================
COUNTER ANIMATION
==================================================*/


const counters =
document.querySelectorAll(".counter");



const counterObserver =
new IntersectionObserver((entries)=>{


entries.forEach(entry=>{


if(entry.isIntersecting){


const counter =
entry.target;


const target =
parseInt(counter.innerText);



let count=0;



const update = ()=>{


const speed =
target / 80;



if(count < target){


count += speed;


counter.innerText =
Math.ceil(count)+"+";


setTimeout(update,20);


}

else{


counter.innerText =
target+"+";


}


};



update();



counterObserver.unobserve(counter);



}



});


},{


threshold:.5


});





counters.forEach(counter=>{


counterObserver.observe(counter);


});










/*==================================================
SCROLL REVEAL ANIMATION
==================================================*/


const revealElements =
document.querySelectorAll(
".service-card, .portfolio-card, .testimonial-card, .feature-box, .stat-box, .pricing-card"
);



const revealObserver =
new IntersectionObserver((items)=>{


items.forEach(item=>{


if(item.isIntersecting){


item.target.classList.add("fade-up");


}


});


},{

threshold:.15

});




revealElements.forEach(el=>{


revealObserver.observe(el);


});










/*==================================================
IMAGE LAZY LOAD
==================================================*/


document.querySelectorAll("img")
.forEach(img=>{


img.loading="lazy";


});









/*==================================================
CONTACT FORM
==================================================*/


const contactForm =
document.querySelector(".contact-form form");



if(contactForm){



contactForm.addEventListener("submit",(e)=>{


e.preventDefault();



const button =
contactForm.querySelector("button");



if(button){


button.innerHTML =
"Sending...";


button.disabled=true;


}




setTimeout(()=>{


alert(
"Thank you for contacting Sivexo Soft. We will get back to you soon."
);



contactForm.reset();



if(button){


button.innerHTML =
"Send Message";


button.disabled=false;


}



},1500);



});



}










/*==================================================
NEWSLETTER FORM
==================================================*/


const newsletter =
document.querySelector(".newsletter");



if(newsletter){


newsletter.addEventListener("submit",(e)=>{


e.preventDefault();



alert(
"Thanks for subscribing to Sivexo Soft updates!"
);



newsletter.reset();



});


}









/*==================================================
SMOOTH SCROLL LINKS
==================================================*/


document.querySelectorAll(
'a[href^="#"]'
)
.forEach(anchor=>{


anchor.addEventListener("click",(e)=>{


const target =
document.querySelector(
anchor.getAttribute("href")
);



if(target){


e.preventDefault();



target.scrollIntoView({

behavior:"smooth"

});


}



});


});









/*==================================================
CURRENT YEAR FOOTER
==================================================*/


const year =
document.querySelector(".footer-bottom p");



if(year){


year.innerHTML =
`© ${new Date().getFullYear()} Sivexo Soft. All Rights Reserved.`;


}










/*==================================================
TYPING EFFECT (OPTIONAL HERO)
==================================================*/


const typing =
document.querySelector(".typing");



if(typing){


const text =
typing.innerText;


typing.innerText="";


let index=0;



function type(){


if(index < text.length){


typing.innerHTML += text.charAt(index);


index++;


setTimeout(type,80);


}


}



type();


}










/*==================================================
DISABLE RIGHT CLICK ON IMAGES
==================================================*/


document.querySelectorAll("img")
.forEach(img=>{


img.addEventListener("contextmenu",(e)=>{


e.preventDefault();


});


});



});
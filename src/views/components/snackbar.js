let snackbarTimer=null;

export function showSnackbar(text){
  let bar=document.getElementById("md-snackbar");
  if(!bar){
    bar=document.createElement("div");
    bar.id="md-snackbar"; bar.className="md-snackbar"; bar.setAttribute("role","status"); bar.setAttribute("aria-live","polite");
    document.body.appendChild(bar);
  }
  bar.textContent=text;
  bar.classList.remove("is-visible"); void bar.offsetWidth; bar.classList.add("is-visible");
  clearTimeout(snackbarTimer);
  snackbarTimer=setTimeout(()=>bar.classList.remove("is-visible"),3500);
}

function mountSplide() {
    new Splide('.splide',
        {
            type: 'loop',
            drag: 'free',
            focus: 'center',
            padding: '10rem',
            lazyLoad: 'nearby',
            autoWidth: true,
            autoScroll: {
                speed: 1,
            },
        }
    ).mount(window.splide.Extensions);
}

var lockOnto = null;
var locking = false;
var fontsize = 0;
function scrollLock(time) {
    if(!locking) return;

    lenis.scrollTo(lenis.animatedScroll + lockOnto.getBoundingClientRect().top - 10 * fontsize, {immediate: true});

    requestAnimationFrame(scrollLock);
}

function attachClickHandler() {
    document.querySelectorAll('div.card').forEach(card => card.addEventListener('mousedown', (evt) => {
        if(card.classList.contains('selected')) return;

        const style = window.getComputedStyle(card);
        fontsize = parseFloat(style.fontSize);
        
        card.classList.add('selected');
        clearScrollTop();

        lockOnto = card;
        locking = true;
        requestAnimationFrame(scrollLock);

        setTimeout(() => card.classList.add('expanded'), 300);
        
        setTimeout(() => {
            Array.from(document.querySelectorAll('div.card.selected')).filter(other => other !== card).forEach(other => other.classList.remove('selected', 'expanded'));
        }, 500);

        setTimeout(() => locking = false, 600);
    }));
}

function attachOpacityHandler() {
    document.querySelectorAll('div.card>video').forEach(video => video.addEventListener('transitionstart', (evt) => {
        if(evt.propertyName !== 'opacity') return;

        const style = window.getComputedStyle(video);
        const opacity = style.opacity;
        
        if(opacity < 0.5) video.play();
        else video.pause();
    }));
}

function attachResizeHandler() {
    document.querySelectorAll('div.card').forEach(card => new ResizeObserver(entry => {
        const rect = entry[0].contentRect;
        const style = window.getComputedStyle(card);
        const fontsize = parseFloat(style.fontSize);
        const offset = card.getAttribute('bg-offset');

        const height = rect.width / 16 * 9;
        const wrap = height - fontsize * offset < rect.height;
        const result = wrap ?
            (height - 17.5 * fontsize)
          : (offset * fontsize);

        card.style.setProperty('--bg-offset', -result + 'px');
    }).observe(card));
}

function onLoadFinished() {
    mountSplide();
    attachResizeHandler();
    attachOpacityHandler();
    attachClickHandler();
}

document.addEventListener('DOMContentLoaded', onLoadFinished);


const lenis = new Lenis();
const root = document.querySelector(':root');

function lenisFrame(time) {
    lenis.raf(time);
    requestAnimationFrame(lenisFrame);
}

let scrollTop = true;
lenis.on('scroll', () => {
    if(scrollTop && lenis.animatedScroll > 15) clearScrollTop();
    if(!scrollTop && lenis.animatedScroll <= 15) setScrollTop();
});

function setScrollTop() {
    document.querySelector('.topbar').classList.remove('scrolled');
    document.querySelector('.content').classList.remove('scrolled');
    root.style.setProperty('--scroll-top-radius', '0');
    scrollTop = true;
}

function clearScrollTop() {
    document.querySelector('.topbar').classList.add('scrolled');
    document.querySelector('.content').classList.add('scrolled');
    root.style.setProperty('--scroll-top-radius', '0.25em');
    scrollTop = false;
}

requestAnimationFrame(lenisFrame);

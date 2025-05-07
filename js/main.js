function onLoadFinished() {
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

document.addEventListener('DOMContentLoaded', onLoadFinished);


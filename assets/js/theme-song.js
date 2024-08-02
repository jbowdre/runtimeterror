// retreives the latest link from a musicthread thread and displays it on the page
const themeSongScript = document.currentScript
const urlParams = new URLSearchParams(themeSongScript.src.split('.js')[1])
const params = Object.fromEntries(urlParams.entries())

if (params.id)
{
    const musicthread = `https://musicthread.app/api/v0/thread/${params.id}`
    fetch(musicthread)
    .then((response) => response.json())
    .then((thread) => {
        let themeSong = thread.links[0]
        console.log(themeSong)
        themeSongContainer = document.createElement('div')
        themeSongContainer.className = 'theme-song'
        themeSongContainer.style
        themeSongContainer.innerHTML = `<a href="${themeSong.page_url}"><img src="${themeSong.thumbnail_url}"></a><br><a href="${themeSong.page_url}">${themeSong.title}</a><br><i>${themeSong.artist}</i>`
        themeSongScript.parentNode.insertBefore(themeSongContainer, themeSongScript)
    })
}
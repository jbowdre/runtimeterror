// manipulates the post upvote "kudos" button behavior

window.onload = function() {
  // get the button and text elements
  var kudosButton = document.querySelector('.kudos-button');
  var kudosText = document.querySelector('.kudos-text');
  var emojiSpan = kudosButton.querySelector('.emoji');

  kudosButton.addEventListener('click', function(event) {
    // send the event to Cabin
    cabin.event('kudos')
    // disable the button
    kudosButton.disabled = true;
    kudosButton.classList.add('clicked');
    // change the displayed text
    kudosText.textContent = 'Thanks!';
    kudosText.classList.add('thanks');
    // spin the emoji
    emojiSpan.style.transform = 'rotate(360deg)';
    // change the emoji to celebrate
    setTimeout(function() {
      emojiSpan.textContent = '🎉';
    }, 150);  // half of the css transition time for a smooth mid-rotation change
  });
}

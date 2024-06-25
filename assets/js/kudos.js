// disables kudos button after click

document.addEventListener('DOMContentLoaded', () => {
  const kudosButton = document.querySelector('.kudos-button');
  const kudosText = document.querySelector('.kudos-text');
  const emojiSpan = kudosButton.querySelector('.emoji');

  kudosButton.addEventListener('click', () => {
    cabin.event('kudos')
    kudosButton.disabled = true;
    kudosButton.classList.add('clicked');

    kudosText.textContent = 'Thanks!';
    kudosText.classList.add('thanks');

    // Rotate the emoji
    emojiSpan.style.transform = 'rotate(360deg)';

    // Change the emoji after rotation
    setTimeout(() => {
      emojiSpan.textContent = '🎉';
    }, 150);  // Half of the transition time for a smooth mid-rotation change
  });
});
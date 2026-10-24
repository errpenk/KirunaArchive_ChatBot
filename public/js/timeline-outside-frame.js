
(function() {
  var wrap = document.getElementById('outside-frame-wrap');
  var shell = document.getElementById('shell');

  document.addEventListener('mapViewChange', function(e) {
    var isOutside = e.detail && e.detail.view === 'outside';
    shell.classList.toggle('outside-active', isOutside);
    if (isOutside) {
      wrap.classList.remove('hiding');
      wrap.classList.add('visible');
    } else {
      if (wrap.classList.contains('visible')) {
        wrap.classList.add('hiding');
        wrap.classList.remove('visible');
        wrap.addEventListener('animationend', function handler() {
          wrap.removeEventListener('animationend', handler);
          wrap.classList.remove('hiding');
        });
      }
    }
  });
})();

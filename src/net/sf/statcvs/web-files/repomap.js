(function () {
    'use strict';

    // Simple slice-and-dice treemap renderer (pure JS, no external libs)
    // Exposes window.RepoMap.init(containerId, dataUrl)

    function sumWeights(node) {
      if (!node) return 0;
      if (node.children && node.children.length) {
        var s = 0;
        for (var i = 0; i < node.children.length; i++) s += sumWeights(node.children[i]);
        node._weight = s;
        return s;
      }
      var w = node.weight || node.size || 0;
      node._weight = w;
      return w;
    }

    function pushUnique(stack, node) {
      if (!stack || !node) return;
      // helper: compare two nodes for identity by reference, path (if present) or label+weight
      function nodeEquals(a, b) {
        if (a === b) return true;
        if (!a || !b) return false;
        if (a.path && b.path && a.path === b.path) return true;
        if (a.label && b.label && a.label === b.label && a._weight !== undefined && b._weight !== undefined && a._weight === b._weight) return true;
        return false;
      }
      // never push the root again (root should stay at index 0)
      if (stack.length > 0 && nodeEquals(stack[0], node)) return;
      // avoid any duplicate anywhere in the stack
      for (var i = 0; i < stack.length; i++) {
        if (nodeEquals(stack[i], node)) return;
      }
      stack.push(node);
    }

    function createTooltip() {
      var tip = document.createElement('div');
      tip.className = 'repomap-tooltip';
      tip.style.display = 'none';
      document.body.appendChild(tip);
      return tip;
    }

    function formatNumber(n) {
      return (n === null || n === undefined) ? '' : String(n);
    }

    function colorFromValue(v) {
      var pct = Number(v) || 0;
      var r=200, g=200, b=200;
      if (pct >= 0) {
        var t = Math.min(pct/100, 1);
        r = Math.round(200*(1-t));
        g = Math.round(200);
        b = Math.round(200*(1-t));
      } else {
        var t = Math.min(-pct/100, 1);
        r = Math.round(200);
        g = Math.round(200*(1-t));
        b = Math.round(200*(1-t));
      }
      return 'rgb('+r+','+g+','+b+')';
    }

    function layoutSquarified(items, x, y, w, h) {
      var rects = [];
      if (!items || items.length === 0) return rects;
      var nodes = items.slice().sort(function(a,b){ return b.value - a.value; });
      var total = nodes.reduce(function(s,it){ return s + (it.value||0); }, 0);
      if (total === 0) return rects;
      var rx = x, ry = y, rw = w, rh = h;

      function layoutRow(row, rrx, rry, rrw, rrh, horizontal) {
        var rowSum = row.reduce(function(s,it){ return s + it.value; }, 0);
        if (horizontal) {
          var rowWidth = (rowSum/total) * rrw;
          var off = 0;
          for (var i=0;i<row.length;i++) {
            var it = row[i];
            var iw = (rowWidth * (it.value/rowSum));
            rects.push({node: it.node, x: rrx + off, y: rry, w: Math.max(1, Math.round(iw)), h: Math.max(1, Math.round(rrh))});
            off += iw;
          }
          return {rx: rrx + rowWidth, ry: rry, rw: Math.max(0, rrw - rowWidth), rh: rrh};
        } else {
          var rowHeight = (rowSum/total) * rrh;
          var off2 = 0;
          for (var j=0;j<row.length;j++) {
            var it2 = row[j];
            var ih = (rowHeight * (it2.value/rowSum));
            rects.push({node: it2.node, x: rrx, y: rry + off2, w: Math.max(1, Math.round(rrw)), h: Math.max(1, Math.round(ih))});
            off2 += ih;
          }
          return {rx: rrx, ry: rry + rowHeight, rw: rrw, rh: Math.max(0, rrh - rowHeight)};
        }
      }

      function worstAspect(row, shortSide) {
        if (!row || row.length===0) return Infinity;
        var sum = row.reduce(function(s,it){ return s + it.value; }, 0);
        var maxv = row.reduce(function(m,it){ return Math.max(m, it.value); }, 0);
        var minv = row.reduce(function(m,it){ return Math.min(m, it.value); }, Infinity);
        var s = (shortSide * shortSide * maxv) / (sum * sum);
        var t = (sum * sum) / (shortSide * shortSide * Math.max(1, minv));
        return Math.max(s, t);
      }

      var remaining = nodes.slice();
      while (remaining.length > 0 && rw > 0 && rh > 0) {
        var horizontal = rw >= rh;
        var side = horizontal ? rh : rw;
        var row = [];
        row.push(remaining.shift());
        var bestWorst = worstAspect(row, side);
        while (remaining.length > 0) {
          var cand = remaining[0];
          var trial = row.concat([cand]);
          var wst = worstAspect(trial, side);
          if (wst <= bestWorst) { row = trial; bestWorst = wst; remaining.shift(); } else { break; }
        }
        var nextRect = layoutRow(row, rx, ry, rw, rh, horizontal);
        rx = nextRect.rx; ry = nextRect.ry; rw = nextRect.rw; rh = nextRect.rh;
      }
      return rects;
    }

    function findNeighborElement(container, currentEl, direction) {
      var nodes = Array.prototype.slice.call(container.querySelectorAll('.repomap-node'));
      if (!currentEl) return nodes[0] || null;
      var curRect = currentEl.getBoundingClientRect();
      var cx = curRect.left + curRect.width / 2; var cy = curRect.top + curRect.height / 2;
      var desiredAngle = 0;
      if (direction === 'left') desiredAngle = Math.PI;
      else if (direction === 'right') desiredAngle = 0;
      else if (direction === 'up') desiredAngle = -Math.PI/2;
      else if (direction === 'down') desiredAngle = Math.PI/2;
      var curDepth = parseInt(currentEl.getAttribute('data-depth')||'0',10);
      var passes = [function(n){ return parseInt(n.getAttribute('data-depth')||'0',10) === curDepth; }, function(n){ return true; }];
      for (var p=0;p<passes.length;p++) {
        var best = null; var bestScore = Infinity;
        nodes.forEach(function(n){
          if (n === currentEl) return;
          if (!passes[p](n)) return;
          var r = n.getBoundingClientRect();
          var nx = r.left + r.width / 2; var ny = r.top + r.height / 2;
          var dx = nx - cx, dy = ny - cy;
          var dist = Math.sqrt(dx*dx + dy*dy);
          if (dist === 0) return;
          var angle = Math.atan2(dy, dx);
          var angleDiff = Math.abs(angle - desiredAngle);
          if (angleDiff > Math.PI) angleDiff = 2*Math.PI - angleDiff;
          var dot = Math.cos(desiredAngle) * dx + Math.sin(desiredAngle) * dy;
          if (dot <= 0) return;
          var depth = parseInt(n.getAttribute('data-depth')||'0',10);
          var depthBonus = (depth === curDepth) ? 0.75 : 1.0;
          var overlapBonus = 1.0;
          if (direction === 'left' || direction === 'right') {
            var topA = r.top, bottomA = r.bottom;
            var topB = curRect.top, bottomB = curRect.bottom;
            var overlap = Math.max(0, Math.min(bottomA, bottomB) - Math.max(topA, topB));
            if (overlap > 0) overlapBonus = 0.8;
          } else {
            var leftA = r.left, rightA = r.right;
            var leftB = curRect.left, rightB = curRect.right;
            var overlap2 = Math.max(0, Math.min(rightA, rightB) - Math.max(leftA, leftB));
            if (overlap2 > 0) overlapBonus = 0.8;
          }
          var score = dist * (1 + (angleDiff / Math.PI)) * depthBonus * overlapBonus;
          if (score < bestScore) { bestScore = score; best = n; }
        });
        if (best) return best;
      }
      try {
        var parent = container.parentElement;
        while (parent && parent !== document.body) {
          if (parent.classList && parent.classList.contains('repomap-node')) {
            if (parent !== currentEl) return parent;
          }
          parent = parent.parentElement;
        }
      } catch (e) {}
      return null;
    }

    function renderNodes(container, node, x, y, w, h, horizontal, tooltip, state, depth) {
      if (!node) return;
      if (!node.children || node.children.length === 0) return;
      var items = [];
      for (var i=0;i<node.children.length;i++) {
        items.push({node: node.children[i], value: node.children[i]._weight || 0});
      }
      var rects = layoutSquarified(items, x, y, w, h);
      for (var i=0;i<rects.length;i++) {
        var r = rects[i];
        var child = r.node;
        if (child.children && child.children.length) {
          var div = document.createElement('div');
          div.className = 'repomap-node branch';
          div.style.position = 'absolute';
          div.style.left = r.x + 'px';
          div.style.top = r.y + 'px';
          div.style.width = r.w + 'px';
          div.style.height = r.h + 'px';
          div.setAttribute('data-depth', (depth||0));
          div.__repomap_node = child;
          div.style.boxSizing = 'border-box';
          div.style.border = '1px solid rgba(0,0,0,0.12)';
          div.style.background = '#f7f7f7';
          div.style.cursor = 'zoom-in';
          div.setAttribute('tabindex', 0);
          div.setAttribute('role','button');
          div.setAttribute('aria-label', child.label || '');
          var lbl = document.createElement('div'); lbl.className='repomap-label'; lbl.textContent = child.label || '';
          lbl.style.overflow = 'hidden'; lbl.style.textOverflow = 'ellipsis'; lbl.style.whiteSpace = 'nowrap'; lbl.style.paddingRight = '4px';
          lbl.style.position = 'absolute'; lbl.style.left = '4px'; lbl.style.top = '2px'; lbl.style.right = '4px'; lbl.style.height = '16px'; lbl.style.lineHeight = '16px'; lbl.style.fontSize = '12px'; lbl.style.pointerEvents = 'none';
          lbl.style.userSelect = 'none'; lbl.style.webkitUserSelect = 'none'; lbl.style.MozUserSelect = 'none';
          div.appendChild(lbl);
          container.appendChild(div);
          (function(c){
            div.addEventListener('click', function(e){
              e.stopPropagation();
              try {
                // collect branch nodes from this div up to the document body
                var p = div;
                var ancestors = [];
                while (p && p !== document.body) {
                  if (p.__repomap_node) ancestors.push(p.__repomap_node);
                  p = p.parentElement;
                }
                // reverse to outermost..deepest
                ancestors = ancestors.reverse();
                // find index of current in ancestor chain
                var startIndex = -1;
                for (var i=0;i<ancestors.length;i++) { if (ancestors[i] === state.current) { startIndex = i; break; } }
                var toPush = [];
                if (startIndex >= 0) toPush = ancestors.slice(startIndex+1);
                else toPush = ancestors;
                if (toPush.length > 0) {
                for (var j=0;j<toPush.length;j++) pushUnique(state.zoomStack, toPush[j]);
                state.current = state.zoomStack[state.zoomStack.length-1];
                  draw(state);
                  return;
                }
              } catch (ex) {}
              // fallback: simple push
              state.zoomStack.push(c); state.current = c; draw(state);
            });
            div.addEventListener('keydown', function(e){ if (e.key==='Enter') { div.click(); } if (e.key==='Escape') { if (state.zoomStack.length>1) { state.zoomStack.pop(); state.current = state.zoomStack[state.zoomStack.length-1]; draw(state); } } });
            div.addEventListener('mouseenter', function(e){ tooltip.style.display='block'; tooltip.innerHTML = '<strong>'+escapeHtml(c.label)+'</strong>'; var info=[]; if (c._weight) info.push('LOC: '+c._weight); if (info.length) tooltip.innerHTML += '<div>'+escapeHtml(info.join(' | '))+'</div>'; });
            div.addEventListener('mousemove', function(e){ tooltip.style.left = (e.pageX+12)+'px'; tooltip.style.top = (e.pageY+12)+'px'; });
            div.addEventListener('mouseleave', function(e){ tooltip.style.display='none'; });
          })(child);
          var innerX = 4, innerY = 20, innerW = Math.max(1, r.w - 8), innerH = Math.max(1, r.h - 22);
          renderNodes(div, child, innerX, innerY, innerW, innerH, !horizontal, tooltip, state, (depth||0)+1);
        } else {
          var leaf = document.createElement('div');
          leaf.className = 'repomap-node leaf';
          leaf.style.position='absolute';
          leaf.style.left = r.x + 'px';
          leaf.style.top = r.y + 'px';
          leaf.style.width = r.w + 'px';
          leaf.style.height = r.h + 'px';
          leaf.setAttribute('data-depth', (depth||0));
          leaf.__repomap_node = child;
          leaf.style.boxSizing = 'border-box';
          leaf.style.border = '1px solid rgba(255,255,255,0.5)';
          leaf.style.cursor = 'auto';
          leaf.setAttribute('tabindex', 0);
          leaf.setAttribute('role','button');
          leaf.setAttribute('aria-label', child.label || '');
          leaf.style.background = colorFromValue(child.value);
          var l = document.createElement('div'); l.className='repomap-label'; l.textContent = child.label || '';
          l.style.overflow = 'hidden'; l.style.textOverflow = 'ellipsis'; l.style.whiteSpace = 'nowrap'; l.style.paddingRight = '4px';
          l.style.position = 'absolute'; l.style.left = '4px'; l.style.top = '2px'; l.style.right = '4px'; l.style.height = '16px'; l.style.lineHeight = '16px'; l.style.fontSize = '12px'; l.style.pointerEvents = 'none';
          l.style.userSelect = 'none'; l.style.webkitUserSelect = 'none'; l.style.MozUserSelect = 'none';
          leaf.appendChild(l);
          container.appendChild(leaf);
          (function(c){
            leaf.addEventListener('click', function(e){ e.stopPropagation();
              try {
                // collect branch nodes from the leaf up to the top
                var p = leaf.parentElement;
                var ancestors = [];
                while (p && p !== document.body) {
                  if (p.__repomap_node) ancestors.push(p.__repomap_node);
                  p = p.parentElement;
                }
                // ancestors[] is [deepest,...,outermost]; reverse to [outermost,...,deepest]
                ancestors = ancestors.reverse();
                // find current root in the ancestor chain
                var startIndex = -1;
                for (var i=0;i<ancestors.length;i++) { if (ancestors[i] === state.current) { startIndex = i; break; } }
                var toPush = [];
                if (startIndex >= 0) {
                  toPush = ancestors.slice(startIndex+1);
                } else {
                  // current not in chain (unlikely) - push entire chain
                  toPush = ancestors;
                }
                if (toPush.length > 0) {
                  for (var j=0;j<toPush.length;j++) pushUnique(state.zoomStack, toPush[j]);
                  state.current = state.zoomStack[state.zoomStack.length-1];
                  draw(state);
                  return;
                }
              } catch (ex) {}
            });
            leaf.addEventListener('keydown', function(e){ if (e.key==='Enter') { leaf.click(); } if (e.key==='Escape') { if (state.zoomStack.length>1) { state.zoomStack.pop(); state.current = state.zoomStack[state.zoomStack.length-1]; draw(state); } } });
            leaf.addEventListener('mouseenter', function(e){ tooltip.style.display='block'; tooltip.innerHTML = '<strong>'+escapeHtml(c.label)+'</strong>'; var info=[]; if (c._weight) info.push('LOC:'+c._weight); if (c.change!==undefined) info.push('change:'+c.change); if (c.value!==undefined) info.push('value:'+c.value); if (c.path) info.push('path:'+escapeHtml(c.path)); if (info.length) tooltip.innerHTML += '<div>'+escapeHtml(info.join(' | '))+'</div>'; });
            leaf.addEventListener('mousemove', function(e){ tooltip.style.left = (e.pageX+12)+'px'; tooltip.style.top = (e.pageY+12)+'px'; });
            leaf.addEventListener('mouseleave', function(e){ tooltip.style.display='none'; });
          })(child);
        }
      }
      if (!container.__repomap_nav_attached) {
        container.addEventListener('keydown', function(e){
          var dir = null;
          if (e.key === 'ArrowLeft') dir='left'; else if (e.key==='ArrowRight') dir='right'; else if (e.key==='ArrowUp') dir='up'; else if (e.key==='ArrowDown') dir='down';
          if (dir) {
            e.preventDefault();
            var active = document.activeElement;
            var target = findNeighborElement(container, active, dir) || findNeighborElement(container, null, dir);
            if (target) target.focus();
          }
        });
        container.__repomap_nav_attached = true;
      }
    }

    function clearContainer(container) {
      while (container.firstChild) container.removeChild(container.firstChild);
    }

    function draw(state) {
      var container = state.container;
      clearContainer(container);
      var root = state.current;
      sumWeights(root);
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      var tooltip = state.tooltip;
      renderNodes(container, root, 0, 0, container.clientWidth, container.clientHeight, true, tooltip, state, 0);
      var crumb = document.getElementById('repomap-crumb');
      if (!crumb) {
        crumb = document.createElement('div'); crumb.id='repomap-crumb'; crumb.className='repomap-crumb';
        crumb.style.position = 'fixed'; crumb.style.left = '8px'; crumb.style.bottom = '8px'; crumb.style.background = 'rgba(0,0,0,0.6)'; crumb.style.color = '#fff'; crumb.style.padding = '6px 8px'; crumb.style.borderRadius = '4px'; crumb.style.fontSize = '12px'; crumb.style.zIndex = 9999;
        document.body.appendChild(crumb);
        crumb.addEventListener('click', function(e){
          var target = e.target && e.target.getAttribute && e.target.getAttribute('data-crumb-index');
          if (target !== null && target !== undefined) {
            var idx = parseInt(target, 10);
            if (!isNaN(idx) && idx >= 0 && idx < state.zoomStack.length) {
              state.zoomStack = state.zoomStack.slice(0, idx+1);
              state.current = state.zoomStack[state.zoomStack.length-1];
              draw(state);
            }
          }
        });
      }
      crumb.innerHTML = '';
      for (var i=0;i<state.zoomStack.length;i++) {
        var node = state.zoomStack[i];
        var span = document.createElement('span');
        span.textContent = node.label || '';
        span.setAttribute('data-crumb-index', String(i));
        span.style.cursor = 'pointer';
        span.style.marginRight = '6px';
        if (i < state.zoomStack.length-1) {
          span.style.opacity = '0.8';
          span.style.paddingRight = '6px';
          var sep = document.createElement('span'); sep.textContent = '›'; sep.style.marginRight='6px'; sep.style.opacity='0.6'; sep.style.color='#ddd';
          crumb.appendChild(span);
          crumb.appendChild(sep);
        } else {
          span.style.fontWeight = '600'; span.style.opacity='1';
          crumb.appendChild(span);
        }
      }

      // centralized hover handler
      if (!container.__repomap_hover_attached) {
        container.addEventListener('mousemove', function(e){
          try {
            var el = document.elementFromPoint(e.clientX, e.clientY);
            var branchEl = el;
            while (branchEl && branchEl !== document.body && !branchEl.classList.contains('branch')) branchEl = branchEl.parentElement;
            if (branchEl !== state._lastHighlightedBranch) {
              if (state._lastHighlightedBranch) state._lastHighlightedBranch.style.border = '1px solid rgba(0,0,0,0.12)';
              if (branchEl && branchEl.__repomap_node && branchEl.__repomap_node.children && branchEl.__repomap_node.children.length) {
                branchEl.style.border = '1px solid rgba(42,132,255,0.95)';
                state._lastHighlightedBranch = branchEl;
              } else {
                state._lastHighlightedBranch = null;
              }
            }
            var leafEl = el;
            while (leafEl && leafEl !== document.body && !leafEl.classList.contains('leaf')) leafEl = leafEl.parentElement;
            if (leafEl !== state._lastCursorLeaf) {
              if (state._lastCursorLeaf) state._lastCursorLeaf.style.cursor = 'auto';
              if (leafEl) {
                var p = leafEl.parentElement; var found = false;
                while (p && p !== document.body) {
                  if (p.__repomap_node && p.__repomap_node.children && p.__repomap_node.children.length) { found = true; break; }
                  p = p.parentElement;
                }
                leafEl.style.cursor = found ? 'zoom-in' : 'auto';
              }
              state._lastCursorLeaf = leafEl;
            }
          } catch (ex) {}
        });
        container.addEventListener('mouseleave', function(e){
          try {
            if (state._lastHighlightedBranch) { state._lastHighlightedBranch.style.border = '1px solid rgba(0,0,0,0.12)'; state._lastHighlightedBranch = null; }
            if (state._lastCursorLeaf) { state._lastCursorLeaf.style.cursor = 'auto'; state._lastCursorLeaf = null; }
          } catch (ex) {}
        });
        container.__repomap_hover_attached = true;
      }
    }

    function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function initWithData(containerId, data) {
      var container = document.getElementById(containerId);
      if (!container) return;
      sumWeights(data);
      var tooltip = createTooltip();
      var state = { container: container, tooltip: tooltip, root: data, current: data, zoomStack: [data] };
      window.RepoMapState = state;
      draw(state);
      window.addEventListener('resize', function(){ draw(state); });
    }

    function initFromUrl(containerId, url) {
      fetch(url).then(function(resp){ return resp.json(); }).then(function(data){ initWithData(containerId, data); }).catch(function(err){ console.error('repomap load error', err); });
    }

    window.RepoMap = {
      init: initFromUrl,
      initWithData: initWithData
    };

    document.addEventListener('DOMContentLoaded', function(){
      var c = document.getElementById('repomap');
      if (c) {
        initFromUrl('repomap', 'repomap-data.json');
      }
    });

   })();

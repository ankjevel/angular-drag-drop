angular.module('dragAndDrop', [])
.directive('drag', function (dndApi, $window) {

  var drags = [];
  var parent = function (drag, max) {
    if (max > 5) {
      return false;  /* Just incase */
    }
    var p = drag.parent();
    if (p.hasClass('drop')) {
      return p[0];
    } else {
      max++;
      return parent(p, max);
    }
  };

  return {
    restrict: 'A',
    link: function ($scope, $elem, $attr) {
      var ngModel;
      if (angular.isDefined($scope.node)) {
        ngModel = $scope.node;
      } else if (angular.isDefined($scope.channel)) {
        ngModel = $scope.channel;
      } else {
        ngModel = $scope.$eval($attr.ngModel);
        if (angular.isUndefined(ngModel)) {
          return;
        }
      }

      var clone = {
        colors: [],
        elem: null
      };

      if (angular.isDefined($attr.clone)) {
        if ($attr.clone === 'mid') {
          clone.colors = ['#2e4b65','#123453'];
        } else {
          clone.colors = ['#222','#101010'];
        }
      }

      var elem = $elem[0];

      var end = $scope.$eval($attr.onDrag);

      function renderClone() {
        var canvas = $window.document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
        canvas.width = '330';
        canvas.height = '120';

        var background = canvas.getContext('2d').createLinearGradient(0, 0, 0, 310);
        background.addColorStop(0, clone.colors[0]);
        background.addColorStop(1, clone.colors[1]);

        canvas.getContext('2d').beginPath();
        canvas.getContext('2d').rect(0, 0, 330, 120);

        canvas.getContext('2d').beginPath();
        canvas.getContext('2d').moveTo(10, 10);
        canvas.getContext('2d').lineTo(320, 10);
        canvas.getContext('2d').lineTo(320, 110);
        canvas.getContext('2d').lineTo(10, 110);
        canvas.getContext('2d').lineTo(10, 10);
        canvas.getContext('2d').strokeStyle = 'rgba(0,0,0,0.5)';
        canvas.getContext('2d').stroke();

        canvas.getContext('2d').shadowColor = 'rgba(0,0,0,0.5)';
        canvas.getContext('2d').shadowBlur = 10;

        canvas.getContext('2d').fillStyle = background;
        canvas.getContext('2d').fillRect(10, 10, 310, 100);

        clone.elem = $window.document.createElement('img');
        clone.elem.src = canvas.toDataURL();
      }

      elem.addEventListener('dragstart', function (e) {

        if (drags.length === 0) {
          drags = angular.element.find('.drop');
        }

        angular.forEach(dndApi.areas(), function (value, key) {
          if (value[0] !== parent($elem, 0)) {
            value.addClass('draging');
          }
        });

        $elem.addClass('on-drag');

        (e.originalEvent || e).dataTransfer.effectAllowed = e.altKey ? 'copy' : 'move';
        (e.originalEvent || e).dataTransfer.setData('text/html', '');

        var offset;

        if (angular.isDefined($attr.clone)) {
          renderClone();
          offset = 150;
          (e.originalEvent || e).dataTransfer.setDragImage(clone.elem, 160, 60);
        } else {
          offset = e.offsetX;
        }

        dndApi.setData(ngModel, offset);
      });

      elem.addEventListener('dragend', function (e) {
        $elem.removeClass('on-drag');

        angular.forEach(dndApi.areas(), function (area) {
          area.removeClass('draging');
        });

        if (angular.isFunction(end)) {
          if (e.dataTransfer.dropEffect === 'move') {
            $scope.$apply(function () {
              end(ngModel);
            });
          }
        }

        dndApi.clear();
        clone.elem = null;
      });

      elem.setAttribute('draggable', true);
    }
  };
}).directive('onDropped', function (dndApi) {

  var areas = [];
  var drags = [];

  return {
    link: function ($scope, $elem, $attr) {
      var ngModel;

      if (angular.isDefined($scope.node)) {
        ngModel = $scope.node;
      } else if (angular.isDefined($scope.channel)) {
        ngModel = $scope.channel;
      } else if (angular.isDefined($attr.ngModel)) {
        ngModel = $scope.$eval($attr.ngModel);
      }

      var elem = $elem[0];

      var drop = $scope.$eval($attr.onDropped);

      var left   = elem.offsetLeft,
          right  = left + elem.offsetWidth,
          top    = elem.offsetTop,
          bottom = top + elem.offsetHeight;

      dndApi.addArea($elem);

      elem.addEventListener('drop', function (e) {

        var result = dndApi.getData();

        if (e.stopPropagation()) {
          e.preventDefault();
        }

        if (angular.isFunction(drop) && angular.isDefined(result)) {

          if (typeof $scope.elementWidth !== "undefined") {
            var x = (e.offsetX - result.offset) / $scope.elementWidth * 100;
            result.data.position = {
              x: Math.max(Math.min(x, 100), 0)
            };
          }

          result.data.type = result.data.name.match(/\.mid$/i) ? 'mid' : 'wav';

          $scope.$apply(function () {
            drop(result.data);
          });
        }

        angular.forEach(dndApi.areas(), function (area, key) {
          area.addClass('draging');
        });

        dndApi.clear();
      });

      elem.addEventListener('dragover', function (e) {
        if (e.preventDefault) {
          e.preventDefault();
        }
        return false;
      });
    }
  };

}).factory('dndApi', function () {

  var dnd = {
    dragObject : {}
  };

  var areas = [];

  return {
    addArea: function (area){
      areas.push(area);
    },
    areas: function () {
      return areas;
    },
    setData: function (data, offset) {
      if (angular.isUndefined(data)) {
        dnd.drag = {};
        return;
      }
      var copy = angular.copy(data);
      dnd.drag = {
        data: copy,
        offset: offset
      };
    },
    clear : function (){
      delete dnd.drag;
    },
    getData : function (){
      return dnd.drag;
    }
  };
});
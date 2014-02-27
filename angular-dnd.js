angular.module('dragAndDrop', [])
.directive('drag', function (dndApi, $window) {

  return {
    restrict: 'A',
    link: function ($scope, $elem, $attr) {

      var ngModel;
      if (angular.isDefined($scope.node)) {
        ngModel = $scope.node;
      } else if (angular.isDefined($scope.channel)) {
        ngModel = $scope.channel;
      } else if (angular.isDefined($scope.region)) {
        ngModel = $scope.region;
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

      var end;

      if (angular.isDefined($attr.onDragEnd)) {
        end = $scope.$eval($attr.onDragEnd);
      }

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

        (e.originalEvent || e).dataTransfer.effectAllowed = e.altKey ? 'copy' : 'move';
        (e.originalEvent || e).dataTransfer.setData('text/html', '');

        var offset;

        e.fromElement = elem;

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

      elem.addEventListener('drop', function (e) {

        var result = dndApi.getData();

        if (e.stopPropagation()) {
          e.preventDefault();
        }

        if (angular.isFunction(drop) && angular.isDefined(result)) {
          var name = result.data.name;
          name = name ? name : result.data.url;
          result.data.type = ((name ? name : '').match(/\.mid$/i) ? 'mid' : 'wav');

          $scope.$apply(function () {
            var target = e.target;
            var x = e.offsetX + target.offsetLeft;
            x = x - result.offset;
            drop(result.data, x);
          });
        }

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

  return {
    setData: function (data, offset) {
      if (angular.isUndefined(data)) {
        dnd.drag = {};
        return;
      }
      dnd.drag = {
        data: data,
        offset: offset
      };
    },
    clear : function () {
      delete dnd.drag;
    },
    getData : function () {
      return dnd.drag;
    }
  };
});
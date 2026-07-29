import L from 'leaflet'
import 'leaflet-draw'

/** Russian strings for Leaflet.Draw toolbar / tooltips (mutates L.drawLocal once). */
export function applyLeafletDrawRussianLocale(): void {
  const drawLocal = L.drawLocal
  if (!drawLocal) return

  drawLocal.draw.toolbar.actions = {
    title: 'Отменить рисование',
    text: 'Отмена',
  }
  drawLocal.draw.toolbar.finish = {
    title: 'Завершить рисование',
    text: 'Готово',
  }
  drawLocal.draw.toolbar.undo = {
    title: 'Удалить последнюю точку',
    text: 'Удалить точку',
  }
  drawLocal.draw.toolbar.buttons = {
    ...drawLocal.draw.toolbar.buttons,
    polygon: 'Нарисовать контур поля',
    polyline: 'Линия',
    rectangle: 'Прямоугольник',
    circle: 'Круг',
    marker: 'Маркер',
    circlemarker: 'Круглый маркер',
  }
  drawLocal.draw.handlers.polygon = {
    tooltip: {
      start: 'Нажмите на карту, чтобы поставить первую точку.',
      cont: 'Продолжайте ставить точки по краю поля.',
      end: 'Нажмите на первую точку, чтобы замкнуть контур.',
    },
  }
  drawLocal.edit.toolbar.actions = {
    save: {
      title: 'Сохранить изменения',
      text: 'Сохранить',
    },
    cancel: {
      title: 'Отменить правки',
      text: 'Отмена',
    },
    clearAll: {
      title: 'Удалить все фигуры',
      text: 'Очистить всё',
    },
  }
  drawLocal.edit.toolbar.buttons = {
    edit: 'Изменить контур',
    editDisabled: 'Нет контура для изменения',
    remove: 'Удалить контур',
    removeDisabled: 'Нет контура для удаления',
  }
  drawLocal.edit.handlers.edit = {
    tooltip: {
      text: 'Перетащите вершины, чтобы изменить контур.',
      subtext: 'Нажмите «Отмена», чтобы сбросить правки.',
    },
  }
  drawLocal.edit.handlers.remove = {
    tooltip: {
      text: 'Нажмите на контур, чтобы удалить его.',
    },
  }
}

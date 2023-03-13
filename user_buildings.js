// use addMenuItem from main script
addToolsMenuItem('Поиск архитектуры' + ' (Ctrl + F9)', SearchArchitecturesHandler, 120, true);
var _searchArchitecturesViewerModalInitialized = false;
const UNDEFINED_TEXT = '[undefined text]',
    MAXLEVEL = 7,
    ALLLEVELS = 0,
    DEBUG = false;
var searchString = '',
    searchLevel = 1,
    destroyableOnlyShow = false,
    improvableOnlyShow = false;
var buildingTypeInfoPanelMap = {
    'decoration': 'cDecorationInfoPanel',
    'minimal': 'cMinimalInfoPanel',
    'enemy': 'cEnemyBuildingInfoPanel',
};

function SearchArchitecturesHandler(event) {
    $('div[role="dialog"]:not(#searchArchitecturesModal):visible').modal('hide');
    if (!_searchArchitecturesViewerModalInitialized)
        $('#searchArchitecturesModal').remove();
    createModalWindow('searchArchitecturesModal', 'Архитектура острова');
    $('#searchArchitecturesModal .modal-header').append(
        '<br><div class="container-fluid" id="searchArchitecturesSelectLevel"><b>Уровень:</b>&emsp; </div>');
    for (i = 1; i <= MAXLEVEL; i++) {
        $('<label><input type="radio" name="searchArchitecturesRadio" value={0}> &thinsp;{1}&emsp; </label>'.format(
            i, (i < MAXLEVEL ? i : i + '+')
        )).appendTo('#searchArchitecturesSelectLevel');
    }
    $('<label><input type="radio" name="searchArchitecturesRadio" value={0}> &thinsp;{1}&emsp; </label>'.format(
        ALLLEVELS, 'Любой'
    )).appendTo('#searchArchitecturesSelectLevel');
    $('#searchArchitecturesModal .modal-header').append(
        '<br><div class="container-fluid" id="searchArchitecturesSelectFound"><b>Найти:</b>&emsp;</div>'
    );
    $('<input>', {
        'type': 'text', 'id': 'searchArchitecturesFind', 'class': 'form-control',
        'style': 'display: inline;width: 300px;', 'value': searchString
    }).appendTo('#searchArchitecturesSelectFound');
    $('<label>&emsp</label>').appendTo('#searchArchitecturesSelectFound');
    $('<label><input type="checkbox" id="searchImprovableArchitecturesOnly"> &thinsp;Можно улучшить&emsp; </label>'
    ).appendTo('#searchArchitecturesSelectFound');
    $('<label><input type="checkbox" id="searchDestroyableArchitecturesOnly"> &thinsp;Разрушаемое&emsp; </label>'
    ).appendTo('#searchArchitecturesSelectFound');
    $('#searchArchitecturesModal .modal-header').append('<br><div class="container-fluid">' + createTableRow([
        [5, 'Наименование'],
        [3, 'Усилитель'],
        [1, ''],
        [2, 'Статус'],
        [1, ''],
    ], true) + '</div>');
    $('#searchArchitecturesModal #searchArchitecturesFind').keyup(function (e) {
        searchString = $(e.target).val();
        if (!searchString || searchString == "") {
            $('#searchArchitecturesModalData .container-fluid div:hidden').show();
            return;
        }
        $('#searchArchitecturesModalData .container-fluid .row').each(function (i, item) {
            if ($(item.firstChild).text().toUpperCase().indexOf(searchString.toUpperCase()) == -1) {
                $(item).hide();
            } else {
                $(item).show();
            }
        });
    });
    $('input[name="searchArchitecturesRadio"][value=' + searchLevel + ']').prop('checked', true);
    $('input[name="searchArchitecturesRadio"]').click(function () {
        searchLevel = $(this).val();
        _updateArchitecturesModalData();
    });
    $('#searchImprovableArchitecturesOnly').prop('checked', improvableOnlyShow);
    $('#searchImprovableArchitecturesOnly').click(function () {
        improvableOnlyShow = $('#searchImprovableArchitecturesOnly').is(':checked');
        _updateArchitecturesModalData();
    });
    $('#searchDestroyableArchitecturesOnly').prop('checked', destroyableOnlyShow);
    $('#searchDestroyableArchitecturesOnly').click(function () {
        destroyableOnlyShow = $('#searchDestroyableArchitecturesOnly').is(':checked');
        _updateArchitecturesModalData();
    });
    _updateArchitecturesModalData();
    $('#searchArchitecturesModal:not(:visible)').modal({ backdrop: 'static' });
}

function _updateArchitecturesModalData() {
    var buildingList = _getArchitecturesList();
    $('#searchArchitecturesModalData').html(_searchArchitecturesModal(buildingList));
    var keys = Object.keys(buildingList);
    keys.sort().forEach(function (key) {
        buildingList[key].forEach(function (item) {
            if (item.goto != '')
                document.getElementById('buildPOS_' + item.grid).addEventListener(
                    'click', function () { _buildingViewerGoTo(item.grid, item.building); }
                );
        });
    });
    $('#searchArchitecturesModalData .container-fluid .row').each(function (i, item) {
        if ($(item.firstChild).text().toUpperCase().indexOf(searchString.toUpperCase()) == -1) {
            $(item).hide();
        } else {
            $(item).show();
        }
    });
}

function _getArchitecturesList() {
    var buildingList = {};
    swmmo.application.mGameInterface.mCurrentPlayerZone.mStreetDataMap.mBuildingContainer.forEach(function (item) {
        if (item.isGarrison()) { return; } // гарнизон
        var isDestroyableMountain = item.IsDestroyableMountain();
        if (isDestroyableMountain != destroyableOnlyShow) { return; }
        var level = item.GetUIUpgradeLevel();
        if (!(searchLevel == MAXLEVEL && level >= MAXLEVEL || searchLevel == level || searchLevel == ALLLEVELS)) { return; }
        var grid = item.GetGrid();
        var buildingGoto = '';
        if (grid > 0)
            buildingGoto = getImageTag('accuracy.png', '24px', '24px').replace(
                '<img', '<img id="buildPOS_' + grid + '"'
            ).replace('style="', 'style="cursor: pointer;');
        var name = item.GetBuildingName_string();
        if (
            name.toUpperCase().indexOf('EW_') != -1 ||
            name.toUpperCase().indexOf('DECORATION_MOUNTAIN_PEAK') != -1 ||
            name.toUpperCase().indexOf('BANDITS') != -1
        ) { return; }
        var isUpgradeAllowed = item.IsUpgradeAllowed(true) && !isDestroyableMountain && !_findBuildingType(item, ['decoration', 'minimal', 'enemy']);
        if (improvableOnlyShow && !isUpgradeAllowed) { return; }
        var locName = loca.GetText('BUI', name);
        if (locName.indexOf(UNDEFINED_TEXT) >= 0) {
            locName = name;
        }
        if (buildingList[locName] === undefined) {
            buildingList[locName] = new Array();
        }
        buff = '';
        if (item.productionBuff != null) {
            buff = loca.GetText("RES", item.productionBuff.GetBuffDefinition().GetName_string());
        }
        buildingList[locName].push({
            'grid': grid,
            'name': name,
            'goto': buildingGoto,
            'locName': locName,
            'level': level,
            'building': item,
            'isWorking': item.IsProductionActive(),
            'isUpgradeInProgress': item.IsUpgradeInProgress(),
            'isUpgradeAllowed': isUpgradeAllowed,
            'buff': buff,
        });
    });
    return buildingList
}

function _buildingViewerGoTo(g, b) {
    try {
        $('#searchArchitecturesModal').modal('hide');
        swmmo.application.mGameInterface.mCurrentPlayerZone.ScrollToGrid(g);
        swmmo.application.mGameInterface.SelectBuilding(b)
    }
    catch (e) { }
}

function _findBuildingType(b, bTypes) {
    var panelClass = globalFlash.gui.GetInfoPanel(b.GetBuildingName_string());
    var className = window.runtime.flash.utils.getQualifiedClassName(panelClass);
    var found = false;
    for (t in buildingTypeInfoPanelMap) {
        if (bTypes.indexOf(t) >= 0){
            found = found || (className == 'GUI.GAME::{0}'.format(buildingTypeInfoPanelMap[t]));
        }
    }
    return found;
}

function _searchArchitecturesModal(buildingList) {
    var out = '<div class="container-fluid">';
    try {
        var keys = Object.keys(buildingList);
        keys.sort().forEach(function (key) {
            var buildingCount = buildingList[key].length,
                firstItem = buildingList[key][0],
                prefix = '&#9500',
                counter = 1;
            out += createTableRow([
                [12, '<b>' + firstItem.locName + '</b>' + (DEBUG ? ' <sup>' + firstItem.name + '</sup>' : '')],
            ]);
            buildingList[key].sort(_compareArchitecturesByLevel).forEach(function (item) {
                if (counter == buildingCount) {
                    prefix = '&#9492;';
                }
                itemStatus = '';
                if (!item.isWorking) {
                    itemStatus = 'Остановлен';
                }
                if (item.isUpgradeInProgress) {
                    itemStatus = 'Улучшается'
                }
                out += createTableRow([
                    [5, prefix + (itemStatus == '' ? '' : ' <span style="color:LightGray;font-style:italic;">') +
                        ' <sup>' + item.level + '</sup>&thinsp;' + item.locName + (itemStatus == '' ? '' : '</span>')
                    ],
                    [3, (itemStatus == '' ? ' ' : ' <span style="color:LightGray;font-style:italic;">') +
                        '<small>' + item.buff + '</small>' + (itemStatus == '' ? '' : '</span>')],
                    [1, item.isUpgradeAllowed ? '&#11014;' : ''],
                    [2, '<span style="color:LightGray;font-style:italic;"><small>' + itemStatus + '</small></span>'],
                    [1, item.goto]
                ]);
                counter++;
            });
        });
    }
    catch (e) {
        out += '<p>Error: ' + e + '/<p>'
    }
    return out + '</div>';
}

function _compareArchitecturesByLevel(a, b) {
    if (a.level < b.level) return -1;
    if (a.level > b.level) return 1;
    return 0;
}

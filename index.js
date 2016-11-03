var options = {
    timeout: 60e3,
    // see https://github.com/cujojs/rest/blob/master/docs/interceptors.md#module-rest/interceptor/retry
    retry: {
        initial: 1e3,
        multiplier: 2,
        max: 10e3
    }
};
var bgg = require('bgg')(options);
var _ = require('lodash');
var math = require('mathjs');

collection('thot')
    .then(function (results)
    {
//        ratingCompared(results);
//        ratingPerYear(results);

        var ids = results.items.item.map(function (item)
        {
            return item.objectid;
        });
        game(ids.join(','))
            .then(function (results)
            {
//                topCategories(results);
//                topMechanics(results);
//                averageTime(results);
//                averageWeight(results);
//                topDesigners(results);
//                topArtists(results);
//                topSubdomains(results);
//                mechanicsCombination(results);
                everythingCombination(results);
            });
    });


function collection(username)
{
    return bgg('collection', {username: username, own: 1, stats: 1});
}


function game(id)
{
    return bgg('thing', {id: id, stats: 1});
}


function averageTime(results)
{
    var times = results.items.item.map(function (item)
    {
        return _.mean([item.minplaytime.value, item.maxplaytime.value]);
    });
    console.log(_.mean(_.filter(times)));
}


function topCategories(games)
{
    getTop(5, 'boardgamecategory', games);
}

function topDesigners(games)
{
    getTop(5, 'boardgamedesigner', games);
}
function topArtists(games)
{
    getTop(5, 'boardgameartist', games);
}
function topMechanics(games)
{
    getTop(5, 'boardgamemechanic', games);
}

function getTop(howMany, which, games)
{
    var ids = [];
    var credits = _.reduce(games.items.item, function (carry, item)
    {
        var someCredits = _.reduce(item.link, function (result, link)
        {
            if (link.type == which)
            {
                ids.push(link.id);
                result[link.id] = link.value;
            }
            return result;
        }, {});
        return _.assign(carry, someCredits);
    }, {});

    ids = _.countBy(ids);

    var top = [];
    _.forIn(ids, function (value, key)
    {
        top.push({id: key, count: value, name: credits[key]});
    });
    console.log(_.takeRight(_.orderBy(top, 'count'), howMany));
}

function topSubdomains(games)
{
    var howMany = 5;
    var ids = [];
    var rankings = _.reduce(games.items.item, function (carry, item)
    {
        var someRankings = _.reduce(item.statistics.ratings.ranks.rank, function (result, ranking)
        {
            if (ranking.type == 'family')
            {
                ids.push(ranking.id);
                result[ranking.id] = ranking.friendlyname;
            }
            return result;
        }, {});
        return _.assign(carry, someRankings);
    }, {});
    ids = _.countBy(ids);

    var top = [];
    _.forIn(ids, function (value, key)
    {
        top.push({id: key, count: value, name: rankings[key]});
    });
    console.log(_.takeRight(_.orderBy(top, 'count'), howMany));
}


function averageWeight(games)
{
    var weights = games.items.item.map(function (item)
    {
        return item.statistics.ratings.averageweight.value;
    });
    console.log(_.mean(weights));
}

function ratingCompared(collection)
{
    var ratings = collection.items.item.map(function (item){
        return {
            player: item.stats.rating.value,
            average: item.stats.rating.average.value,
            geek: item.stats.rating.bayesaverage.value
        };
    });
    console.log(ratings);
}

function ratingPerYear(collection)
{
    var ratings = collection.items.item.map(function (item){
        return {
            year: item.yearpublished,
            player: item.stats.rating.value,
            average: item.stats.rating.average.value,
            geek: item.stats.rating.bayesaverage.value
        };
    });
    var perYear = _.groupBy(ratings, function (item) {
        return item.year;
    });

    _.forIn(perYear, function(items, year){
        var reduced = _.reduce(items, function(carry, item){
            carry.player.push(item.player);
            carry.average.push(item.average);
            carry.geek.push(item.geek);
            return carry;
        }, {
            player: [],
            average: [],
            geek: []
        });

        reduced.player = _.mean(_.filter(reduced.player, function (value) {
            return _.isFinite(value);
        }));
        reduced.average = _.mean(reduced.average);
        reduced.geek = _.mean(reduced.geek);
        reduced.delta = Math.abs(reduced.player - reduced.average);
        perYear[year] = reduced;
    });
    console.log(perYear);
}

function mechanicsCombination(games)
{
    var ids = [];
    var mechanics = _.reduce(games.items.item, function (carry, item)
    {
        var someCredits = _.reduce(item.link, function (result, link)
        {
            if (link.type == 'boardgamemechanic')
            {
                result[link.id] = link.value;
            }
            return result;
        }, {});
        return _.assign(carry, someCredits);
    }, {});
    var mechanicKeys = Object.keys(mechanics);
    mechanicKeys = mechanicKeys.map(function(value){
        return parseInt(value);
    });

    var matrix = math.matrix();
    matrix.resize([mechanicKeys.length, mechanicKeys.length]);

    _.forEach(games.items.item, function (item)
    {
        var gameMechanics = _.reduce(item.link, function (result, link)
        {
            if (link.type == 'boardgamemechanic')
            {
                result.push(link.id);
            }
            return result;
        }, []);
        var combinations = k_combinations(gameMechanics, 2);

        _.forEach(combinations, function(combo){
            var x = mechanicKeys.indexOf(combo[0]);
            var y = mechanicKeys.indexOf(combo[1]);

            var previous = matrix.subset(math.index(x, y));
            matrix.subset(math.index(x, y), previous + 1);
            matrix.subset(math.index(y, x), previous + 1);
        })
    });

    fs = require('fs');
    fs.writeFile('matrix.json', JSON.stringify({matrix: matrix, names: _.values(mechanics)}))
}


function everythingCombination(games)
{
    var bgs = {};
    _.forEach(games.items.item, function (item)
    {
        var gameMechanics = [];
        var gameCategories = [];
        var gameSubdomains = [];
        _.forEach(item.link, function (link)
        {
            if (link.type == 'boardgamemechanic')
            {
                gameMechanics.push(link.id);
            }
            if (link.type == 'boardgamecategory')
            {
                gameCategories.push(link.id);
            }
        });

        _.forEach(item.statistics.ratings.ranks.rank, function (ranking)
        {
            if(!ranking.type == 'family') return;
            if(!bgs[ranking.id])
            {
                bgs[ranking.id] = {
                    name: ranking.friendlyname,
                    children: []
                };
            }
            console.log(gameCategories);
            _.forEach(gameCategories, function(category){
                console.log(_.indexOf(bgs[ranking.id].children));
//                if(!bgs[ranking.id].children[category])
//                {
//                    bgs[ranking.id].children[category] = {
//                        name: category,
//                        children: []
//                    }
//                }
            })
        });
    });
    var asd = {
        name: 'bgs',
        children: [
            {
                name: 'strat',
                children: [
                    {
                        name: 'card game',
                        children: [
                            {
                                name: 'variable pp',
                                count: 2,
                                rating: 6
                            }
                        ]
                    }
                ]
            }
        ]
    };
    console.log(bgs);
}


function k_combinations(set, k) {
    var i, j, combs, head, tailcombs;

    if (k > set.length || k <= 0) {
        return [];
    }

    if (k == set.length) {
        return [set];
    }

    if (k == 1) {
        combs = [];
        for (i = 0; i < set.length; i++) {
            combs.push([set[i]]);
        }
        return combs;
    }

    // Assert {1 < k < set.length}

    combs = [];
    for (i = 0; i < set.length - k + 1; i++) {
        head = set.slice(i, i+1);
        tailcombs = k_combinations(set.slice(i + 1), k - 1);
        for (j = 0; j < tailcombs.length; j++) {
            combs.push(head.concat(tailcombs[j]));
        }
    }
    return combs;
}

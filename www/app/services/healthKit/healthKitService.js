angular.module('app.services.healthKit')

.factory('healthKitService', ['healthKitApi', 'healthKitStubApi', 'workoutProcessor', '$q', '$rootScope', 'decisionTreeStorage',
	function(healthKitApi, healthKitStubApi, workoutProcessor, $q, $rootScope, decisionTreeStorage) {
        var api = {};

        // if ($rootScope.healthkitExists){
        //     api = healthKitApi;
        // }else{
        //     api = healthKitStubApi;getMostActiveTimeOfWeek
        // }
         //api = healthKitStubApi;

         api = healthKitApi;

        function checkHealthKitExists(){
            var deferred = $q.defer();
            api.checkHealthKitExists().then(function(exists){
                if (!exists){
                    api = healthKitStubApi;
                }

                deferred.resolve(exists);
            });

            return deferred.promise;
        }

        function requestAuthorization(){
            return api.requestAuthorization();
        }

        function checkAuthStatus(){
            return api.checkAuthStatus();
        }

        function getActivities(){
        	var deferred = $q.defer();
        	api.getWalkingAndRunningDistance().then(function(walkRunActivities){
        		var processedActivities = workoutProcessor.processWorkouts(walkRunActivities);
                deferred.resolve(processedActivities);
        	});
        	return deferred.promise;
        }

        function getTwoWeeksAverages(){
            var deferred = $q.defer();
            api.getWalkingAndRunningDistance().then(
                function(walkRunActivities){
                    var twoWeekAverages = workoutProcessor.calculateTwoWeeksAvgMinutes(walkRunActivities);
                    deferred.resolve(twoWeekAverages);
                },
                function(err){
                    deferred.reject(err);
                });
            return deferred.promise;
        }

        function getWeekdayWeekendAverages(){
        	var deferred = $q.defer();
        	api.getWalkingAndRunningDistance().then(function(walkRunActivities){
                var weekdayWeekendAverages = workoutProcessor.calculateWeekdayWeekendAverages(walkRunActivities);
                determineWeekdayOrWeekendActive(weekdayWeekendAverages.weekdayAverage, weekdayWeekendAverages.weekendAverage);
                
                var labels = ["Weekday", "Weekend"];
                var dataSets = 
                [
                    {
                        name: "weekdayVsWeekendAvg",
                        data: [weekdayWeekendAverages.weekdayAverage, 
                                weekdayWeekendAverages.weekendAverage]
                    }
                ];

                var chartDataContainer = {
                    labels: labels,
                    dataSets: dataSets
                };

                deferred.resolve(chartDataContainer);
        	});
        	return deferred.promise;
        }

        /* determine if weekday or weekend is more active and save to storage */
        function determineWeekdayOrWeekendActive(weekdayDuration, weekendDuration){
            var diff = weekdayDuration - weekendDuration;
                var denominator = weekendDuration == 0 ? weekdayDuration : weekendDuration;
                /* handle case where both weekend and weekday activities are 0 */
                if (denominator == 0){
                    decisionTreeStorage.weekdayOrWeekendActive = "equal";
                }

                var percentDiff = diff/denominator * 100;
                if(percentDiff > 5){
                    /* weekday > weekend */
                    decisionTreeStorage.weekdayOrWeekendActive = "weekday";
                }else if(percentDiff < -5){
                    decisionTreeStorage.weekdayOrWeekendActive = "weekend";          
                }else{
                    decisionTreeStorage.weekdayOrWeekendActive = "equal";
                }
        }

        function getActivityDurationByDate(){
            var deferred = $q.defer();
            api.getWalkingAndRunningDistance().then(function(walkRunActivities){
                var durationsByDate = workoutProcessor.getActivityDurationByDate(walkRunActivities);
                var dataSets = [];
                var labels = [];
                var chartDataContainers = [];
                _.each(durationsByDate, function(durationByDate){
                    var dataSets = [{
                        name: durationByDate.date,
                        data: durationByDate.durationSum
                    }];

                    chartDataContainers.push({
                        dataSets: dataSets
                    })

                });

                deferred.resolve(chartDataContainers);
            });
            return deferred.promise;
        }

        
        function getCombinedTimesOfDayAverages(){
            var deferred = $q.defer();

            api.getWalkingAndRunningDistance().then(function(walkRunActivities){
                var timesOfDayAverages = getTimesOfDayAverages(walkRunActivities);
                console.log(JSON.stringify(timesOfDayAverages));

                deferred.resolve(timesOfDayAverages);
            });

            return deferred.promise;
        }

        function getWeekdayTimesOfDayAverages(){
            var deferred = $q.defer();

            api.getWalkingAndRunningDistance().then(function(walkRunActivities){
                
                function weekdayFilter(rawActivityObject){
                    var rawActivityDateObj = new Date(rawActivityObject.startDate.replace(/-/g, "/"));
                    var isWeekday = rawActivityDateObj.getDay() > 0 && rawActivityDateObj.getDay() < 6;

                    return isWeekday;
                }

                var timesOfDayAverages = getTimesOfDayAverages(walkRunActivities, weekdayFilter);
                deferred.resolve(timesOfDayAverages);
            });

            return deferred.promise;
        }

        function getWeekdayOrWeekendActive(){
            return decisionTreeStorage.weekdayOrWeekendActive;
        }

        function getMostActiveTimeOfWeek(){
            var deferred = $q.defer();
            var weekdayOrWeekendActive = decisionTreeStorage.weekdayOrWeekendActive;
                if(weekdayOrWeekendActive === "weekday"){
                    /* weekday > weekend */
                    getWeekdayTimesOfDayAverages().then(function(response){
                        var maxTimeOfDay = _.max(response, function(timeOfDay){
                            return timeOfDay.duration;
                        });
                        
                        var mostActiveTimeOfWeek = 
                        {
                            timeOfWeek: "weekday",
                            timeOfDay: maxTimeOfDay.timeOfDay,
                            duration: maxTimeOfDay.duration
                        };

                        deferred.resolve(mostActiveTimeOfWeek);
                    });

                }else if(weekdayOrWeekendActive === "weekend"){
                    /* weekend > weekday */
                  getWeekendTimesOfDayAverages().then(function(response){
                        var maxTimeOfDay = _.max(response, function(timeOfDay){
                            return timeOfDay.duration;
                        });
                        
                        var mostActiveTimeOfWeek = 
                        {
                            timeOfWeek: "weekend",
                            timeOfDay: maxTimeOfDay.timeOfDay,
                            duration: maxTimeOfDay.duration
                        };

                        deferred.resolve(mostActiveTimeOfWeek);
                    });                
                }else{
                    /* equal, display weekday */
                  getWeekdayTimesOfDayAverages().then(function(response){
                        var maxTimeOfDay = _.max(response, function(timeOfDay){
                            return timeOfDay.duration;
                        });
                        
                        var mostActiveTimeOfWeek = 
                        {
                            timeOfWeek: "weekday",
                            timeOfDay: maxTimeOfDay.timeOfDay,
                            duration: maxTimeOfDay.duration
                        };

                        deferred.resolve(mostActiveTimeOfWeek);
                    });                
                }

            return deferred.promise;
        }

        /* average duration for morning, afternoon, and evenings 
           on the weekend. mainly for onboarding tree */
        function getWeekendTimesOfDayAverages(){
            var deferred = $q.defer();

            api.getWalkingAndRunningDistance().then(function(walkRunActivities){
                
                function weekdayFilter(rawActivityObject){
                    var rawActivityDateObj = new Date(rawActivityObject.startDate.replace(/-/g, "/"));
                    var isWeekday = rawActivityDateObj.getDay() > 0 && rawActivityDateObj.getDay() < 6;

                    return !isWeekday;
                }

                var timesOfDayAverages = getTimesOfDayAverages(walkRunActivities, weekdayFilter);
                console.log(JSON.stringify(timesOfDayAverages));

                deferred.resolve(timesOfDayAverages);
            });

            return deferred.promise;
        }

        /* average duration for morning, afternoon, and evenings. 
           mainly used for onboarding tree. can filter results using 
           filterFunction param */
        function getTimesOfDayAverages(rawActivityObjects, filterFunction){
            var morningStartDateTime = new Date("1/1/1900 05:00");
            var morningEndDateTime = new Date("1/1/1900 12:00");
            var weekdayMorningAverage = workoutProcessor.getAverageActivityDuration(morningStartDateTime, morningEndDateTime, rawActivityObjects, filterFunction);
            
            var afternoonStartDateTime = new Date("1/1/1900 12:00");
            var afternoonEndDateTime = new Date("1/1/1900 17:00");
            var weekdayAfternoonAverage = workoutProcessor.getAverageActivityDuration(afternoonStartDateTime, afternoonEndDateTime, rawActivityObjects, filterFunction);
            
            var eveningStartDateTime = new Date("1/1/1900 17:00");
            var eveningEndDateTime = new Date("1/1/1900 23:59");
            var weekdayEveningAverage = workoutProcessor.getAverageActivityDuration(eveningStartDateTime, eveningEndDateTime, rawActivityObjects, filterFunction);

            var timesOfDayAverages = [
                {
                    timeOfDay: "morning",
                    duration: weekdayMorningAverage
                },
                {
                    timeOfDay: "afternoon",
                    duration: weekdayAfternoonAverage
                },
                {
                    timeOfDay: "evening",
                    duration: weekdayEveningAverage
                },
            ];

            return timesOfDayAverages;
        }

        /* get today's data points vs average and use for plotting. data is 
           contained inside chartDataContainer obj */
        function getDateVsAverageDataPoints(startDateTime, endDateTime){
            var deferred = $q.defer();
            var labels = [];
            var dataSets = [];
            getActivityDataPoints(startDateTime, endDateTime).then(function(response){
                labels = response.times;
                console.log("response durations: " + response.durations);
                dataSets.push({
                    name: "today",
                    data: response.durations
                });

            })
            .then(function(){
                return getAverageActivityDataPoints(startDateTime, endDateTime);
            })
            .then(function(response){
                dataSets.push(
                    {
                        name: "average",
                        data: response.durations
                    });

                var chartDataContainer = {
                    labels: labels,
                    dataSets: dataSets
                };

                deferred.resolve(chartDataContainer);
            });

            return deferred.promise;
        }

        /*
        * Provides current day and average activity duration
        */
        function getDateVsAverageDuration(startDateTime, endDateTime){
            var deferred = $q.defer();
            var labels = [];
            var dataSets = [];
            var dataPoints = {};
            getActivityDataPoints(startDateTime, endDateTime).then(function(response){
                labels = response.times;
                console.log("response durations: " + response.durations);
                dataPoints['todayData'] = response.durations[response.durations.length-1];
            })
            .then(function(){
                return getAverageActivityDataPoints(startDateTime, endDateTime);
            })
            .then(function(response){
               dataPoints['avgData'] = response.durations[response.durations.length-1];
               deferred.resolve(dataPoints);
            });

            return deferred.promise;
        }

        /* returns average activity duration at each hour (7am, 8am...etc.)
           between the specified times. feeding in start/end datetime, but only the 
           time is used */
        function getAverageActivityDataPoints(startDateTime, endDateTime){
			var deferred = $q.defer();
			api.getWalkingAndRunningDistance().then(function(walkRunActivities){
        		var dataPoints = workoutProcessor.getAverageActivityDataPoints(startDateTime, endDateTime, walkRunActivities);
                var times = [];
                var durations = [];
                var index = 0;
                _.each(dataPoints, function(dataPoint){
                    if (index == 0){
                        times.push(dataPoint.time);
                    }else if (index == dataPoints.length-1){
                        times.push("Now");
                    }else{
                        times.push("");
                    }

                    durations.push(dataPoint.averageDuration);
                    index ++;
                });
                var dataPointsObject = {
                    times: times,
                    durations: durations
                };
                deferred.resolve(dataPointsObject);
        	});

        	return deferred.promise;
        }


        /* returns activity durations at each hour (7am, 8am...etc.)between specified 
           startDateTime and endDateTime */
        function getActivityDataPoints(startDateTime, endDateTime){
        	var deferred = $q.defer();
			api.getWalkingAndRunningDistanceByDateTime(startDateTime, endDateTime).then(function(walkRunActivities){
        		
                var dataPoints = workoutProcessor.getActivityDataPoints(startDateTime, endDateTime, walkRunActivities);

                var times = [];
                var durations = [];
                var index = 0;
                _.each(dataPoints, function(dataPoint){
                    times.push(dataPoint.dateTime);

                    durations.push(dataPoint.durationTillNow);
                    index ++;
                });

                var dataPointsObject = {
                    times: times,
                    durations: durations
                };
                deferred.resolve(dataPointsObject);
        	});

        	return deferred.promise;
        }

        /* get last week's average and the week before. data is 
           contained inside chartDataContainer obj */
        function getLastVsPreviousWeekAverage(){
            var deferred = $q.defer();
            getTwoWeeksAverages().then(function(response){
                var labels = ["This week", "Last week"];
                var dataSets = 
                [
                    {
                        name: "thisVsLastAvg",
                        data: response
                    }
                ];

                var chartDataContainer = {
                    labels: labels,
                    dataSets: dataSets
                };

                deferred.resolve(chartDataContainer);
            });

            return deferred.promise;
        }

        /* daily average duration and other users' average */
        function getDailyAverageVsAllUsers(){
            var deferred = $q.defer();
            getDailyAverageDuration().then(function(response){
                var labels = ["You", "Other users"];
                var dataSets = 
                [
                    {
                        name: "averageVsUsers",
                        data: [response, 50]
                    }
                ];

                var chartDataContainer = {
                    labels: labels,
                    dataSets: dataSets
                };

                deferred.resolve(chartDataContainer);
            });

            return deferred.promise;
        }

        //calc avg over N days (depends on what data has)
        function getDailyAverageDuration(){
			var deferred = $q.defer();
			api.getWalkingAndRunningDistance().then(function(walkRunActivities){
        		var total = workoutProcessor.calculateDailyAverageDuration(walkRunActivities);
        		console.log("avg duration: " + total);
        		deferred.resolve(total);
        	});

        	return deferred.promise;
        }

        /* output today's total activity duration as formatted string
            ex: 1 hr 5 min */
        function getTodaysDurationSum(){
        	var deferred = $q.defer();
			api.getWalkingAndRunningDistance().then(function(walkRunActivities){
        		var total = workoutProcessor.calculateTodaysTotalDuration(walkRunActivities);
        		deferred.resolve(total);
        	});

        	return deferred.promise;
        }

        /* output yesterday's total activity duration as formatted string
            ex: 1 hr 5 min */        
        function getYesterdaysDurationSum(){
            var deferred = $q.defer();
            api.getWalkingAndRunningDistance().then(function(walkRunActivities){
                var total = workoutProcessor.calculateYesterdaysTotalDuration(walkRunActivities);
                deferred.resolve(total);
            });

            return deferred.promise;
        }

        /* timestamp and detailed info of most recent activity */ 
        function getMostRecentActivity(){
        	var deferred = $q.defer();
			api.getWalkingAndRunningDistance().then(function(walkRunActivities){
        		var processedActivities = workoutProcessor.processWorkouts(walkRunActivities);
        		var mostRecentActivity = processedActivities[0];
        		console.log("most recent: " + JSON.stringify(mostRecentActivity));
        		deferred.resolve(mostRecentActivity);
        	});

        	return deferred.promise;
        }

			return {
				getActivities: getActivities,
				getWeekdayWeekendAverages: getWeekdayWeekendAverages,
				getDailyAverageDuration: getDailyAverageDuration,
				getTodaysDurationSum: getTodaysDurationSum,
                getYesterdaysDurationSum: getYesterdaysDurationSum,
				getMostRecentActivity: getMostRecentActivity,
				getActivityDataPoints: getActivityDataPoints,
				getAverageActivityDataPoints: getAverageActivityDataPoints,
                getWeekdayTimesOfDayAverages: getWeekdayTimesOfDayAverages,
                getWeekendTimesOfDayAverages: getWeekendTimesOfDayAverages,
                getDateVsAverageDataPoints: getDateVsAverageDataPoints,
                getDailyAverageVsAllUsers: getDailyAverageVsAllUsers,
                getActivityDurationByDate: getActivityDurationByDate,
                getLastVsPreviousWeekAverage: getLastVsPreviousWeekAverage,
                getCombinedTimesOfDayAverages: getCombinedTimesOfDayAverages,
                getMostActiveTimeOfWeek: getMostActiveTimeOfWeek,
                checkHealthKitExists: checkHealthKitExists,
                requestAuthorization: requestAuthorization,
                checkAuthStatus: checkAuthStatus,
                getWeekdayOrWeekendActive: getWeekdayOrWeekendActive,
                getDateVsAverageDuration : getDateVsAverageDuration

			}}]
			);
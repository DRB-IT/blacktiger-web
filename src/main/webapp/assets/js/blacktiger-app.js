/*jslint browser: true*/
/*global angular, BLACKTIGER_VERSION*/
/*************************************** MODULE ********************************************/

var blacktigerApp = angular.module('blacktiger-app', ['ngRoute', 'pascalprecht.translate', 'ui.bootstrap', 'blacktiger-service', 'blacktiger-ui', 'teljs'])
    .config(function ($locationProvider, $routeProvider, $httpProvider, $translateProvider, blacktigerProvider) {
        var mode = "normal",
            token, params = [],
            search, list, url, elements, language, langData;

        // SECURITY (forward to login if not authorized)
        $httpProvider.interceptors.push(function ($location) {
            return {
                'responseError': function (rejection) {
                    if (rejection.status === 401) {
                        $location.path('/login');
                    }
                    return rejection;
                }
            };
        });

        //load config

        // Find params
        search = window.location.search;
        if (search.length > 0 && search.charAt(0) === '?') {
            search = search.substring(1);
            list = search.split('&');
            angular.forEach(list, function (entry) {
                elements = entry.split('=');
                if (elements.length > 1) {
                    params[elements[0]] = elements[1];
                }
            });
        }

        if (angular.isDefined(params.server)) {
            url = params.server;
            blacktigerProvider.setServiceUrl(url);
        }

        if (angular.isDefined(params.token)) {
            mode = "token";
            token = params.token;
        }

        if (mode === 'normal') {
            $routeProvider.
            when('/', {
                controller: RoomCtrl,
                templateUrl: 'assets/templates/room.html'
            }).
            when('/login', {
                controller: LoginCtrl,
                templateUrl: 'assets/templates/login.html'
            }).
            when('/request_password', {
                controller: RequestPasswordCtrl,
                templateUrl: 'assets/templates/request-password.html'
            }).
            when('/settings', {
                controller: SettingsCtrl,
                templateUrl: 'assets/templates/settings-general.html'
            }).
            when('/settings/contact', {
                controller: ContactCtrl,
                templateUrl: 'assets/templates/settings-contact.html'
            }).
            when('/settings/create-listener', {
                controller: CreateSipAccountCtrl,
                templateUrl: 'assets/templates/settings-create-listener.html'
            }).
            when('/admin/realtime', {
                controller: RealtimeCtrl,
                templateUrl: 'assets/templates/realtime-status.html'
            }).
            when('/admin/history', {
                controller: HistoryCtrl,
                templateUrl: 'assets/templates/system-history.html'
            }).
            otherwise({
                redirectTo: '/'
            });
        }

        if (mode === 'token') {
            $routeProvider.
            when('/', {
                controller: SipAccountRetrievalCtrl,
                templateUrl: 'assets/templates/sipaccount-retrieve.html',
                resolve: {
                    token: function () {
                        return token;
                    }
                }
            }).
            otherwise({
                redirectTo: '/'
            });
        }

        // REMARK: If BLACKTIGER_VERSION has been set, we will load from a yui-compressed file
        $translateProvider.useStaticFilesLoader({
            prefix: 'assets/js/i18n/blacktiger-locale-',
            suffix: BLACKTIGER_VERSION ? '-' + BLACKTIGER_VERSION + '.json' : '.json'
        });

        language = window.navigator.userLanguage || window.navigator.language;
        langData = language.split("-");
        $translateProvider.preferredLanguage(langData[0]);
        $translateProvider.fallbackLanguage('en');

    }).run(ApplicationBoot)
    .filter('filterByRoles', filterByRoles)
    .directive('btCommentAlert', btCommentAlert)
    .directive('btMusicplayer', btMusicPlayer);

/*************************************** BOOT ********************************************/
function ApplicationBoot(CONFIG, blacktiger, $location, LoginSvc, $rootScope) {
    if (CONFIG.serviceUrl) {
        blacktiger.setServiceUrl(CONFIG.serviceUrl);
    }


    LoginSvc.authenticate().then(angular.noop, function () {
        $location.path('login');
    });

    $rootScope.$on("logout", function () {
        $location.path('login');
    });
}

/*************************************** FILTERS ********************************************/
function filterByRoles() {
    return function (input, roles) {
        var out = [];
        angular.forEach(input, function (entry) {
            if (!entry.requiredRole || (roles && roles.indexOf(entry.requiredRole) >= 0)) {
                out.push(entry);
            }
        });
        return out;
    };
}

/*************************************** DIRECTIVES ********************************************/
function btCommentAlert() {
    return {
        restrict: 'E',
        controller: function ($scope, MeetingSvc) {
            $scope.participants = MeetingSvc.getParticipantList();
            $scope.forcedHidden = false;

            $scope.isCommentRequested = function () {

                var commentRequested = false;

                angular.forEach($scope.participants, function (p) {
                    if (p.commentRequested) {
                        commentRequested = true;
                        return false;
                    }
                });
                return commentRequested;

            };

            $scope.$watch('isCommentRequested()', function (value) {
                if (value === true) {
                    $scope.forcedHidden = false;
                }
            });
        },
        templateUrl: 'assets/templates/bt-commentalert.html'
    };
}

function btMusicPlayer() {
    return {
        restrict: 'E',
        scope: {

        },
        controller: function ($rootScope, $q, $scope, RemoteSongSvc, StorageSvc, AudioPlayerSvc) {
            $scope.currentSong = 0;
            $scope.progress = 0;
            $scope.state = AudioPlayerSvc.getState();
            $scope.maxNumber = RemoteSongSvc.getNumberOfSongs();
            $scope.downloadState = "Idle";
            $scope.hasSongsLocally = false;
            $scope.random = false;

            $scope.downloadFile = function (deferred, number, until) {
                RemoteSongSvc.readBlob(number).then(function (blob) {
                    StorageSvc.writeBlob("song_" + number + ".mp3", blob).then(function () {
                        if (number < until) {
                            number++;
                            $scope.progress = (number / until) * 100;
                            $scope.downloadFile(deferred, number, until);
                        } else {
                            deferred.resolve();
                        }
                    });

                });
            };

            $scope.startDownload = function () {
                StorageSvc.init().then(function () {
                    var deferred = $q.defer(),
                        promise = deferred.promise;
                    $scope.downloadState = "Downloading";
                    $scope.downloadFile(deferred, 1, RemoteSongSvc.getNumberOfSongs());
                    promise.then(function () {
                        $scope.downloadState = "Idle";
                        $scope.hasSongsLocally = true;
                        $scope.currentSong = 1;
                        $scope.progress = 0;
                    });
                });


            };

            $scope.getSongNumbers = function () {
                var numbers = [],
                    i;
                for (i = 1; i <= RemoteSongSvc.getNumberOfSongs(); i++) {
                    numbers[numbers.length] = i;
                }
                return numbers;
            };
            $scope.getProgressStyle = function () {
                return {
                    width: $scope.progress + '%'
                };
            };

            $scope.play = function () {
                AudioPlayerSvc.play();
            };

            $scope.stop = function () {
                AudioPlayerSvc.stop();
            };

            $scope.toggleRandom = function () {
                $scope.random = !$scope.random;
            };

            $scope.$watch('currentSong', function () {
                if ($scope.hasSongsLocally) {
                    $scope.stop();
                    StorageSvc.readBlob("song_" + $scope.currentSong + ".mp3").then(function (blob) {
                        AudioPlayerSvc.setUrl(URL.createObjectURL(blob));
                    });
                }
            });

            $scope.updateProgress = function () {
                $scope.state = AudioPlayerSvc.getState();
                $scope.progress = AudioPlayerSvc.getProgressPercent();
                if ($scope.state === 'playing') {
                    window.setTimeout(function () {
                        $scope.$apply(function () {
                            $scope.updateProgress();
                        });


                    }, 100);
                }
            };

            $scope.isSupported = function () {
                return AudioPlayerSvc.isSupported();
            };

            $rootScope.$on('audioplayer.playing', $scope.updateProgress);
            $rootScope.$on('audioplayer.stopped', $scope.updateProgress);

            StorageSvc.init().then(function () {
                var nameArray = [],
                    i;
                for (i = 1; i <= RemoteSongSvc.getNumberOfSongs(); i++) {
                    nameArray[i - 1] = "song_" + i + ".mp3";
                }
                StorageSvc.hasBlobs(nameArray).then(function () {
                    $scope.hasSongsLocally = true;
                    $scope.currentSong = 1;
                });
            }, 100);

        },
        templateUrl: 'assets/templates/bt-musicplayer.html'
    };
}

/*************************************** CONTROLLERS ********************************************/
function MenuCtrl($scope, $location, LoginSvc, $rootScope, $translate, blacktiger) {
    $scope.location = $location;
    $scope.links = [
        {
            url: "#/",
            name: 'NAVIGATION.PARTICIPANTS',
            icon: 'user',
            requiredRole: 'ROLE_HOST'
        },
        {
            url: "#/settings",
            name: 'NAVIGATION.SETTINGS',
            icon: 'cog',
            requiredRole: 'ROLE_HOST'
        },
        {
            url: function() {
                var url = "http://help.telesal.org/" + $scope.language.toUpperCase();
                return url;
            },
            name: 'NAVIGATION.HELP',
            icon: 'question-sign',
            requiredRole: 'ROLE_HOST',
            target: '_blank'
        },
        {
            url: "#/admin/realtime",
            name: 'NAVIGATION.ADMIN.REALTIME',
            icon: 'transfer',
            requiredRole: 'ROLE_ADMIN'
        },
        {
            url: "#/admin/history",
            name: 'NAVIGATION.ADMIN.HISTORY',
            icon: 'calendar',
            requiredRole: 'ROLE_ADMIN'
        }
    ];
    
    $scope.getUrl = function(link) {
        if(angular.isFunction(link.url)) {
            return link.url();
        } else {
            return link.url;
        }
    };
    
    $scope.languages = [{
        locale: 'da',
        'localizedLanguage': 'Dansk'
    }];

    $scope.$watch('language', function () {
        if ($scope.language !== undefined && $scope.language !== $translate.use()) {
            $translate.use($scope.language);
        }
    });

    $rootScope.$on('$translateChangeSuccess', function () {
        $scope.language = $translate.use();
        $scope.languages = [];
        angular.forEach(['da', 'en', 'fo', 'kl', 'no', 'sv', 'is'], function (entry) {
            $translate('GENERAL.LANGUAGE.' + entry.toUpperCase()).then(function (translation) {
                $scope.languages.push({
                    locale: entry,
                    localizedLanguage: translation,
                    language: blacktiger.getLanguageNames()[entry]
                });
            });
        });

    });
}

function RoomDisplayCtrl($scope, RoomSvc, LoginSvc, $rootScope, MeetingSvc) {
    $scope.rooms = null;

    $scope.updateCurrentRoom = function () {
        if ($scope.currentUser && $scope.currentUser.roles.indexOf('ROLE_HOST') >= 0 &&
            $scope.rooms !== null && $scope.rooms.length > 0) {
            $rootScope.currentRoom = $scope.rooms[0];
            MeetingSvc.setRoom($rootScope.currentRoom);
        } else {
            $rootScope.currentRoom = null;
        }
    };

    $scope.$on("login", function () {
        $scope.rooms = RoomSvc.query();
        $scope.rooms.$promise.then($scope.updateCurrentRoom);
    });
    
    $scope.$on("afterLogout", function () {
        $scope.rooms = null;
        $scope.updateCurrentRoom();
    });

}

function LoginCtrl($scope, $location, LoginSvc) {
    $scope.username = "";
    $scope.password = "";
    $scope.rememberMe = false;
    $scope.status = null;

    $scope.login = function () {
        LoginSvc.authenticate($scope.username, $scope.password, $scope.rememberMe).then(function (user) {
            $scope.status = 'success';
            if (user.roles.indexOf('ROLE_HOST') >= 0) {
                $location.path('');
            } else if (user.roles.indexOf('ROLE_ADMIN') >= 0) {
                $location.path('/admin/realtime');
            }
        }, function (reason) {
            $scope.status = "invalid (reason: " + reason + ")";
        });
    };

    $scope.requestPassword = function () {
        $location.path('/request_password');
    };
}

function RequestPasswordCtrl($scope, $location, $http, blacktiger) {
    $scope.request = {
        phoneNumber: '+45',
        phoneNumberOfHall: '+45'
    };
    $scope.status = null;

    $scope.send = function () {
        $http.post(blacktiger.getServiceUrl() + 'system/passwordRequests', $scope.request).then(function (response) {
            if (response.status !== 200) {
                $scope.status = 'error';
            } else {
                $scope.status = 'ok';
            }
        });
    };

    $scope.cancel = function () {
        $location.path('/login');
    };
}

function RoomCtrl($scope, $cookieStore, $modal, MeetingSvc, PhoneBookSvc, ReportSvc, $log, blacktiger) {
    $scope.participants = MeetingSvc.getParticipantList();
    
    $scope.isHostInConference = function () {
        var value = false;
        angular.forEach($scope.participants, function (p) {
            if (p.host === true) {
                value = true;
                return false;
            }
        });
        return value;
    };

    $scope.kickParticipant = function (channel) {
        MeetingSvc.kick(channel);
    };

    $scope.muteParticipant = function (channel, muted) {
        if (muted) {
            MeetingSvc.mute(channel);
        } else {
            MeetingSvc.unmute(channel);
        }
    };

    $scope.changeName = function (phoneNumber, currentName) {
        var modalInstance = $modal.open({
            templateUrl: 'assets/templates/modal-edit-name.html',
            controller: ModalEditNameCtrl,
            resolve: {
                phoneNumber: function () {
                    return phoneNumber;
                },
                currentName: function () {
                    return currentName;
                }
            }
        });

        modalInstance.result.then(function (newName) {
            PhoneBookSvc.updateEntry(phoneNumber, newName);
        });
    };

    $scope.$on('PhoneBookSvc.update', function (event, phone, name) {
        // Make sure names in participantlist are update.
        angular.forEach($scope.participants, function (p) {
            if (p.phoneNumber === phone) {
                p.name = name;
            }
        });

        // Make sure names in historydata in cookie is updated and update history display.
        var history = $cookieStore.get($scope.historyCookieName);
        angular.forEach(history, function (entry) {
            if (phone === entry.phoneNumber) {
                entry.name = name;
            }
        });
        $cookieStore.put($scope.historyCookieName, history);
        $scope.updateHistory();
    });

    $scope.calculateTotalDuration = function (entry) {
        var duration = 0;
        angular.forEach(entry.calls, function (call) {
            if (call.end !== null) {
                duration += call.end - call.start;
            }
        });
        return duration;
    };

    $scope.noOfCallsForCallerId = function (callerId) {
        var count = 0,
            history = $cookieStore.get($scope.historyCookieName);
        angular.forEach(history, function (entry) {
            if (callerId === entry.callerId) {
                count = entry.calls.length;
            }
        });

        return count;
    };

    $scope.updateHistory = function () {
        var history = $cookieStore.get($scope.historyCookieName),
            participants = MeetingSvc.getParticipantList(),
            cleansedHistory = [];

        angular.forEach(history, function (entry) {
            var stillParticipating = false;
            angular.forEach(participants, function (participant) {
                if (participant.callerId === entry.callerId) {
                    stillParticipating = true;
                    return false;
                }
            });

            if (!stillParticipating && !entry.host) {
                cleansedHistory.push(entry);
            }
        });

        $scope.history = cleansedHistory;
    };

    $scope.deleteHistory = function () {
        $cookieStore.put($scope.historyCookieName, []);
        $scope.updateHistory();
    };
    
    $scope.initHistory = function() {
        if(MeetingSvc.getRoom() !== null) {
            $scope.historyCookieName = 'meetingHistory-' + MeetingSvc.getRoom().id + '-' + blacktiger.getInstanceId();
            $scope.history = $cookieStore.get($scope.historyCookieName);
            if(!$scope.history) {
                $scope.history = {};
                $cookieStore.put($scope.historyCookieName, {});
            }
        }
    };
    
    $scope.noOfHistoryEntries = function() {
        return Object.keys($scope.history).length;
    };

    $scope.$on('MeetingSvc.Join', function (event, participant) {
        //Ignore the host. It will not be part of the history.
        if (participant.host) {
            return;
        }

        $log.debug('New participants - adding to history.');
        var entry, call, history = $cookieStore.get($scope.historyCookieName),
            key = participant.callerId;
        if (history[key] === undefined) {
            entry = {
                type: participant.type,
                callerId: participant.callerId,
                phoneNumber: participant.phoneNumber,
                name: participant.name,
                firstCall: new Date().getTime(),
                calls: []
            };
            history[key] = entry;
        } else {
            entry = history[key];
        }

        call = {
            start: new Date().getTime(),
            end: null
        };
        entry.calls.push(call);

        $cookieStore.put($scope.historyCookieName, history);
        $scope.updateHistory();

    });

    $scope.$on('MeetingSvc.Leave', function (event, participant) {
        $log.debug('MeetingSvc.leave event received - updating history.');
        var history = $cookieStore.get($scope.historyCookieName),
            entry,
            key = participant.callerId;
        entry = history[key];
        if (entry) {
            angular.forEach(entry.calls, function (call) {
                if (call.end === null) {
                    call.end = new Date().getTime();
                    $cookieStore.put($scope.historyCookieName, history);
                    return false;
                }
            });
        }
        $scope.updateHistory();
    });

    $scope.$on('MeetingSvc.RoomChanged', $scope.initHistory);
    $scope.initHistory();

}

function ModalEditNameCtrl($scope, $modalInstance, phoneNumber, currentName) {
    $scope.data = {
        name: currentName,
        phoneNumber: phoneNumber
    };

    $scope.ok = function () {
        $modalInstance.close($scope.data.name);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
}

function CreateSipAccountCtrl($scope, SipUserSvc, blacktiger, $translate) {
    $scope.user = {};
    $scope.mailText = '';
    $scope.e164Pattern = blacktiger.getE164Pattern();
    $scope.innerMailTextPattern = /.*/;
    $scope.mailTextPattern = (function () {
        return {
            test: function (value) {
                var result = $scope.innerMailTextPattern.test(value);
                return result;
            }
        };
    })();


    $scope.reset = function () {
        $scope.user.name = '';
        $scope.user.phoneNumber = '+' + $scope.currentRoom.countryCallingCode;
        $scope.user.email = '';
        $scope.mailText = $translate.instant('SETTINGS.CREATE_SIP_ACCOUNT.DEFAULT_MAILTEXT');
    };

    $scope.createUser = function () {
        var data = {
            account: $scope.user,
            mailText: $scope.mailText
        };
        SipUserSvc.create(data).then(function () {
            $scope.created = angular.copy(data);
            $scope.reset();
            $scope.status = 'success';
        }, function (reason) {
            $scope.reset();
            $scope.status = 'error (reason: ' + reason + ')';
        });
    };

    $scope.onPhoneNumberChanged = function () {
        var number = $scope.user.phoneNumber ? $scope.user.phoneNumber.replace(/[\+\s\-\(\)]/, '') : '',
            noOfCharsToPull = Math.min(4, number.length),
            pattern, i;

        if (noOfCharsToPull === 0) {
            $scope.innerMailTextPattern = '/.*/';
        } else {
            number = number.substr(number.length - noOfCharsToPull, number.length);
            pattern = "^((?!(" + number.charAt(0) + ")";
            for (i = 1; i < number.length; i++) {
                pattern += "[\\s\\w\\W]{0,1}(" + number.charAt(i) + ")";
            }
            pattern += ").)*$";
            $scope.innerMailTextPattern = new RegExp(pattern); //'^((?!' + number + ').)*$');
        }

    };

    $scope.reset();

}

function ContactCtrl($scope, SipUserSvc, RoomSvc, blacktiger) {
    $scope.contact = angular.copy($scope.currentRoom.contact);
    $scope.contact_status = null;
    $scope.e164Pattern = blacktiger.getE164Pattern();

    $scope.updateContact = function () {
        $scope.contact_status = "Saving";
        $scope.currentRoom.contact = angular.copy($scope.contact);
        RoomSvc.save($scope.currentRoom).$promise.then(function () {
            $scope.contact_status = "Saved";
        });
    };
}

function SettingsCtrl($scope, SipUserSvc, RoomSvc, MeetingSvc, LoginSvc) {

    $scope.logout = function () {
        MeetingSvc.clear();
        LoginSvc.deauthenticate();
    };
}

function RealtimeCtrl($scope, SystemSvc, RealtimeSvc, $timeout) {
    $scope.system = {};

    $scope.rooms = RealtimeSvc.getRoomList();

    $scope.getNoOfParticipantsPerRoom = function () {
        var noParticipants = $scope.getNoOfParticipants();
        if (noParticipants === 0 || $scope.rooms.length === 0) {
            return 0;
        } else {
            return $scope.getNoOfParticipants() / $scope.rooms.length;
        }
    };

    $scope.getNoOfParticipants = function () {
        var count = 0;
        angular.forEach($scope.rooms, function (room) {
            angular.forEach(room.participants, function (p) {
                if (!p.host) {
                    count++;
                }
            });
        });
        return count;
    };

    $scope.getSipPercentage = function () {
        var count = 0;
        angular.forEach($scope.rooms, function (room) {
            angular.forEach(room.participants, function (p) {
                if (!p.host && p.type === 'Sip') {
                    count++;
                }
            });
        });
        if (count === 0) {
            return 0.0;
        } else {
            return (count / $scope.getNoOfParticipants()) * 100;
        }
    };

    $scope.getPhonePercentage = function () {
        if ($scope.getNoOfParticipants() === 0) {
            return 0.0;
        } else {
            return 100 - $scope.getSipPercentage();
        }
    };

    $scope.getNoOfCommentRequests = function () {
        var count = 0;
        angular.forEach($scope.rooms, function (room) {
            angular.forEach(room.participants, function (p) {
                if (p.commentRequested) {
                    count++;
                }
            });
        });
        return count;
    };

    $scope.getNoOfOpenMicrophones = function () {
        var count = 0;
        angular.forEach($scope.rooms, function (room) {
            angular.forEach(room.participants, function (p) {
                if (!p.host && !p.muted) {
                    count++;
                }
            });
        });
        return count;
    };

    $scope.updateSystemInfo = function () {
        SystemSvc.getSystemInfo().then(function (data) {
            $scope.system = data;
        });
        //$scope.systemInfoTimerPromise = $timeout($scope.updateSystemInfo, 1000);
    };

    $scope.$on('$destroy', function cleanup() {
        $timeout.cancel($scope.systemInfoTimerPromise);
    });

    $scope.updateSystemInfo();
}

function HistoryCtrl($scope, ReportSvc) {
    $scope.searchHistory = function () {
        ReportSvc.getReport().then(function (data) {
            $scope.historyData = data;
            $scope.summaryHistory();
        });
    };
    $scope.summaryHistory = function () {
        $scope.sumHalls = 0;
        $scope.sumParticipants = 0;
        $scope.sumPhones = 0;
        $scope.sumCalls = 0;
        var countDuration = 0;
        angular.forEach($scope.historyData, function (entry) {
            if (entry.type === "Host") {
                $scope.sumHalls++;
            } else {
                $scope.sumParticipants++;
                $scope.sumCalls += entry.numberOfCalls;
                countDuration += entry.totalDuration;
                if (entry.type == "Phone") {
                    $scope.sumPhones++;
                }
            }
        });
        $scope.sumAverage = $scope.sumParticipants / $scope.sumHalls;
        $scope.sumDuration = countDuration / $scope.sumParticipants;
        $scope.minDuration = $scope.duration;
        $scope.predicate = 'firstCallTimestamp';
    };
}

function SipAccountRetrievalCtrl($scope, SipUserSvc, token) {

    $scope.cleanNumber = function (number) {
        return number.replace(/[\+\-\/\(\) ]/g, '');
    };

    $scope.getSip = function () {
        $scope.status = "Henter oplysninger...";  // EN: "Loading..."
        $scope.sipinfo = null;
        SipUserSvc.get(token, $scope.cleanNumber($scope.phoneNumber)).then(function (data) {
            $scope.status = null;
            $scope.sipinfo = data;
        }, function (reason) {
            $scope.status = "Nummeret blev ikke genkendt, måske tastede du forkert? Hvis du har du et andet telefonnummer, så prøv det. Eller kontakt den der oprettede kontoen til dig, og bed ham oprette den igen med dit korrekte telefonnummer.";
                    // EN: "The number was not recognized, maybe you entered a wrong number? If you own another number, please try it instead. Or contact the one who created this account for you, and ask to have the account created again with the correct number."
            $scope.sipinfo = null;
        });
    };
}

/** BOOTSTRAP **/
angular.element(document).ready(function () {
    var initInjector = angular.injector(['ng']);
    var $http = initInjector.get('$http');
    $http.get('/config.json').then(
        function (response) {
            var config = response.data;
            blacktigerApp.constant('CONFIG', config);
            angular.bootstrap(document, ['blacktiger-app']);
        }
    );

});

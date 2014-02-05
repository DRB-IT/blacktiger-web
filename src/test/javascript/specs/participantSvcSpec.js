describe('Unit testing ParticipantSvc', function() {
    var $rootScope;
    var $httpBackend;
    var Participant;
    var RoomSvc;
    var $timeout;

    beforeEach(module('blacktiger-service'));

    beforeEach(inject(function(_$rootScope_, _$httpBackend_, _ParticipantSvc_, _RoomSvc_, _$timeout_){
        $rootScope = _$rootScope_;
        $httpBackend = _$httpBackend_;
        ParticipantSvc = _ParticipantSvc_;
        RoomSvc = _RoomSvc_;
        $timeout = _$timeout_;
    }));

    it('retreives participants.', function() {
        var room = {
                id: 'DK-9000-2',
                name: 'DK-9000-1 Aalborg, sal 2',
                contact: {
                    name: 'John Doe',
                    phoneNumber: '+4512345678',
                    email: 'example@mail.dk'
                },
                participants: [
                    {
                        userId: 1,
                        muted: false,
                        host: true,
                        phoneNumber: 'PC-xxxxxxxx',
                        dateJoined: 1349333576093,
                        name: 'Testsal',
                        commentRequested: false
                    }
                ]
            };
        
        $rootScope.$broadcast('roomChanged', room);
        expect(ParticipantSvc.getParticipants().length).toBe(1);
        
    });
    
    it('kick participant.', function() {
        var room = {
                id: 'DK-9000-2',
                name: 'DK-9000-1 Aalborg, sal 2',
                contact: {
                    name: 'John Doe',
                    phoneNumber: '+4512345678',
                    email: 'example@mail.dk'
                },
                participants: [
                    {
                        userId: 1,
                        muted: false,
                        host: true,
                        phoneNumber: 'PC-xxxxxxxx',
                        dateJoined: 1349333576093,
                        name: 'Testsal',
                        commentRequested: false
                    }
                ]
            };
        
        var eventQueue = [];
        var onEventRequest = function() {
            var events = eventQueue;
            eventQueue = [];
            console.log('Events request [' + events.length + ']');
            
            return [200, {timestamp:new Date().getTime(),events:events}];
        };
        
        $httpBackend.expectGET(/rooms\/DK-9000-2\/events.?/).respond(onEventRequest);
        
        $httpBackend.expectDELETE('rooms/DK-9000-2/participants/1').respond(function() {
            var participant = room.participants[0];
            room.participants = [];
            console.log('Kick request received as expected ' + participant);
            eventQueue.push({type:'Leave', participant:participant});
            return [200];
        });
        
        RoomSvc.setCurrent(room);
        ParticipantSvc.kickParticipant('1');
        $httpBackend.flush();
        
        $httpBackend.expectGET(/rooms\/DK-9000-2\/events.?/).respond(onEventRequest);
        $timeout.flush();
        $httpBackend.flush();
            
        waitsFor(function() {
            return eventQueue.length === 0;
        }, 'eventQueue should become empty', 200);
        
        runs(function() {
            expect(ParticipantSvc.getParticipants().length).toBe(0);
        });
        
        
    });
    
    it('mutes participant.', function() {
        var room = {
                id: 'DK-9000-2',
                name: 'DK-9000-1 Aalborg, sal 2',
                contact: {
                    name: 'John Doe',
                    phoneNumber: '+4512345678',
                    email: 'example@mail.dk'
                },
                participants: [
                    {
                        userId: 1,
                        muted: false,
                        host: true,
                        phoneNumber: 'PC-xxxxxxxx',
                        dateJoined: 1349333576093,
                        name: 'Testsal',
                        commentRequested: false
                    }
                ]
            };
        
        var eventQueue = [];
        var onEventRequest = function() {
            var events = eventQueue;
            eventQueue = [];
            console.log('Events request [' + events.length + ']');
            
            return [200, {timestamp:new Date().getTime(),events:events}];
        };
        
        $httpBackend.expectGET(/rooms\/DK-9000-2\/events.?/).respond(onEventRequest);
        
        $httpBackend.expectPOST('rooms/DK-9000-2/participants/1/muted').respond(function(url, headers, data) {
            var participant = room.participants[0].muted = data;
            console.log('Mute request received as expected ' + participant);
            eventQueue.push({type:'Change', participant:participant});
            return [200];
        });
        
        RoomSvc.setCurrent(room);
        ParticipantSvc.muteParticipant('1');
        $httpBackend.flush();
        
        $httpBackend.expectGET(/rooms\/DK-9000-2\/events.?/).respond(onEventRequest);
        $timeout.flush();
        $httpBackend.flush();
            
        waitsFor(function() {
            return eventQueue.length === 0;
        }, 'eventQueue should become empty', 200);
        
        runs(function() {
            expect(ParticipantSvc.getParticipants()[0].muted).toBe(true);
        });
        
        
    });
    
    it('unmutes participant.', function() {
        var room = {
                id: 'DK-9000-2',
                name: 'DK-9000-1 Aalborg, sal 2',
                contact: {
                    name: 'John Doe',
                    phoneNumber: '+4512345678',
                    email: 'example@mail.dk'
                },
                participants: [
                    {
                        userId: 1,
                        muted: true,
                        host: true,
                        phoneNumber: 'PC-xxxxxxxx',
                        dateJoined: 1349333576093,
                        name: 'Testsal',
                        commentRequested: false
                    }
                ]
            };
        
        var eventQueue = [];
        var onEventRequest = function() {
            var events = eventQueue;
            eventQueue = [];
            console.log('Events request [' + events.length + ']');
            
            return [200, {timestamp:new Date().getTime(),events:events}];
        };
        
        $httpBackend.expectGET(/rooms\/DK-9000-2\/events.?/).respond(onEventRequest);
        
        $httpBackend.expectPOST('rooms/DK-9000-2/participants/1/muted').respond(function(url, headers, data) {
            var participant = room.participants[0].muted = data;
            console.log('Mute request received as expected ' + participant);
            eventQueue.push({type:'Change', participant:participant});
            return [200];
        });
        
        RoomSvc.setCurrent(room);
        ParticipantSvc.unmuteParticipant('1');
        $httpBackend.flush();
        
        $httpBackend.expectGET(/rooms\/DK-9000-2\/events.?/).respond(onEventRequest);
        $timeout.flush();
        $httpBackend.flush();
            
        waitsFor(function() {
            return eventQueue.length === 0;
        }, 'eventQueue should become empty', 200);
        
        runs(function() {
            expect(ParticipantSvc.getParticipants()[0].muted).toBe(false);
        });
        
        
    });
    
    it('accepts Join event.', function() {
        var room = {
                id: 'DK-9000-2',
                name: 'DK-9000-1 Aalborg, sal 2',
                contact: {
                    name: 'John Doe',
                    phoneNumber: '+4512345678',
                    email: 'example@mail.dk'
                },
                participants: [
                    
                ]
            };
        
        var participant = {
                        userId: 1,
                        muted: false,
                        host: true,
                        phoneNumber: 'PC-xxxxxxxx',
                        dateJoined: 1349333576093,
                        name: 'Testsal',
                        commentRequested: false
                    };
        
        var eventQueue = [];
        var onEventRequest = function() {
            var events = eventQueue;
            eventQueue = [];
            console.log('Events request [' + events.length + ']');
            
            return [200, {timestamp:new Date().getTime(),events:events}];
        };
        
        $httpBackend.expectGET(/rooms\/DK-9000-2\/events.?/).respond(onEventRequest);
        
        RoomSvc.setCurrent(room);
        $httpBackend.flush();
        
        eventQueue.push({type:'Join', participant:participant});
        
        $httpBackend.expectGET(/rooms\/DK-9000-2\/events.?/).respond(onEventRequest);
        $timeout.flush();
        $httpBackend.flush();
            
        waitsFor(function() {
            return eventQueue.length === 0;
        }, 'eventQueue should become empty', 200);
        
        runs(function() {
            expect(ParticipantSvc.getParticipants().length).toBe(1);
        });
        
        
    });
});


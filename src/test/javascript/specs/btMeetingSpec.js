describe('Unit testing btMeeting', function() {
    var $compile;
    var $rootScope;
    var meetingSvc;
    var historySvc;
    
    beforeEach(module('blacktiger-templates'));
    beforeEach(module('blacktiger-ui', function($provide) {
        $provide.constant('CONFIG', {});
    }));

    beforeEach(inject(function(_$compile_, _$rootScope_, _MeetingSvc_, _HistorySvc_){
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      meetingSvc = _MeetingSvc_;
      historySvc = _HistorySvc_;
    }));

    afterEach(inject(function ($log) {
        // dump log output in case of test failure
        if (this.results().failedCount) {
            var out = [];
            angular.forEach(["log", "info", "warn", "error", "debug"], function (logLevel) {
                var logs = $log[logLevel].logs;
                if (!logs.length)
                    return;
                out.push(["*** " + logLevel + " ***"]);
                out.push.apply(out, logs);
                out.push(["*** /" + logLevel + " ***"]);
            });
            if (out.length) {
                console.log("*** logs for: " + this.description + " ***");
                angular.forEach(out, function (items) {
                    console.log.apply(console, items);
                });
            }
        }
        $log.reset();
    }));
   
    it('shows warning that no participants are in the room when empty', function() {
        var element = $compile('<bt-meeting-room room="H45-0000"></bt-meeting-room>')($rootScope);
        $rootScope.$digest();

        var index = element.html().indexOf('PARTICIPANTS.WARNINGS.NO_PARTICIPANTS_AND_TRANSMITTERS')
        expect(index).toBeGreaterThan(0);
    });
    
    it('has an information in the first line of the table about no participants when empty.', function() {
        var element = $compile('<bt-meeting-room room="H45-0000"></bt-meeting-room>')($rootScope);
        $rootScope.$digest();

        var index = element.html().indexOf('PARTICIPANTS.INFO.NO_PARTICIPANTS')
        expect(index).toBeGreaterThan(0);
    });
    
    it('has info about participants when there are some in the room', function() {
        var room = {
            id:'H45-0000'
        };
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234',
            host:false
        };
        
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        $rootScope.$broadcast('PushEvent.Join', room.id, participant);
        
        var element = $compile('<bt-meeting-room room="H45-0000"></bt-meeting-room>')($rootScope);
        $rootScope.$digest();

        var index = element.html().indexOf('PARTICIPANTS.INFO.NO_PARTICIPANTS')
        expect(index).toBeLessThan(0);
        
        console.log(element.html());
        var tbody = element.find('tbody');
        var tds = tbody.find('td');
        var number = tds[0].textContent.trim();
        var name = tds[1].textContent.trim()
        var calls = parseInt(tds[2].textContent.trim());
        var minutes = parseInt(tds[3].textContent.trim());
        
        expect(number).toEqual("+45 22 33 44 55");
        expect(name.indexOf("John Doe")).toBe(0);
        expect(calls).toEqual(1);
        expect(minutes).toEqual(0);
    });
    
    it('has room in scope when conference has started before directive is initialized', function() {
        var room = {
            id:'H45-0000'
        };
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        
        var element = $compile('<bt-meeting-room room="H45-0000"></bt-meeting-room>')($rootScope);
        $rootScope.$digest();
        var scope = element.isolateScope();
        expect(scope.room).toEqual(room);
    });
    
    it('can get total number of minutes for a participant', function() {
        var room = {
            id:'H45-0000'
        };
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        
        var element = $compile('<bt-meeting-room room="H45-0000"></bt-meeting-room>')($rootScope);
        $rootScope.$digest();
        var scope = element.isolateScope();
        expect(scope.room).toEqual(room);
    });
    
    it('has room in scope when conference has started after directive is initialized', function() {
        var room = {
            id:'H45-0000'
        };
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234',
            host:false
        };
        
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        $rootScope.$broadcast('PushEvent.Join', room.id, participant);
        
        var element = $compile('<bt-meeting-room room="H45-0000"></bt-meeting-room>')($rootScope);
        $rootScope.$digest();
        var scope = element.isolateScope();
        
        expect(scope.getTotalDuration(participant)).toBeGreaterThan(0);
    });
    
    
    it('shows a warning when there are participants but no host', function() {
        var room = {
            id:'H45-0000'
        };
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234',
            host:false
        };
        
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        $rootScope.$broadcast('PushEvent.Join', room.id, participant);
        
        var element = $compile('<bt-meeting-room room="H45-0000"></bt-meeting-room>')($rootScope);
        $rootScope.$digest();
        
        var index = element.html().indexOf('PARTICIPANTS.WARNINGS.PARTICIPANTS_BUT_NO_TRANSMITTER_TITLE')
        expect(index).toBeGreaterThan(0);
    });
    
    it('shows host info when conference has one', function() {
        var room = {
            id:'H45-0000'
        };
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234',
            host:true
        };
        
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        $rootScope.$broadcast('PushEvent.Join', room.id, participant);
        
        var element = $compile('<bt-meeting-room room="H45-0000"></bt-meeting-room>')($rootScope);
        $rootScope.$digest();
        var index = element.html().indexOf('<!-- HOST INFO -->')
        expect(index).toBeGreaterThan(0);
    });
    

});

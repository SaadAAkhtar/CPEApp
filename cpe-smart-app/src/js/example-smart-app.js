(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        
        //Queries
        var patient = smart.patient;
        var pt = patient.read();
        
        var medicationOrder = smart.patient.api.fetchAll({
                type: 'MedicationOrder',
                query: {
                  _count: 5
                }
              });

        $.when(pt, medicationOrder).fail(onError);
        $.when(pt, medicationOrder).done(function(patient, medicationOrder) {
          console.log(medicationOrder);
          var len = medicationOrder.length;
          var meds = [];
          
          for (i = 0; i < len; i++) {
            var temp = medicationOrder[i].medicationCodeableConcept.text;
            
            if (meds.indexOf(temp) === -1) {
              meds.push(temp);
            }
          }
          
          console.log(meds);
        });
        
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4', 'http://loinc.org|29463-7', 
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9', 'http://loinc.org|2571-8', 
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4', 'http://loinc.org|2093-3']
                      }
                    }
                  });
        
        //Observation Query Error Handling
        $.when(pt, obv).fail(onError);

        //Observation Query Success Handling
        $.when(pt, obv).done(function(patient, obv) {
          //Function streamline
          var byCodes = smart.byCodes(obv, 'code');
          var p = defaultPatient();
          
          //Variable initilizations
          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');
          var weight = byCodes('29463-7');
          var cholesterol = byCodes('2571-8');
          var trig = byCodes('2093-3');
          var gender = patient.gender;
          var id = patient.id;
          var fname = '';
          var lname = '';
          var address = '';
          var race = '';
          var ethnicity = '';
          var married = '';
          var providerName = '';
          var providerRole = '';
          
          //Variable initilization undefined check
          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }
          
          if (typeof patient.address !== 'undefined') {
            address = patient.address[0].text;
          }
          
          if (typeof patient.extension !== 'undefined' && typeof patient.extension[0] !== 'undefined' && typeof patient.extension[0].extension !== 'undefined' && typeof patient.extension[0].extension[4] !== 'undefined') {
            race = patient.extension[0].extension[4].valueString;
          }
          
          if (typeof patient.extension !== 'undefined' && typeof patient.extension[1] !== 'undefined' && typeof patient.extension[1].extension !== 'undefined' && typeof patient.extension[1].extension[3] !== 'undefined') {
            ethnicity = patient.extension[1].extension[3].valueString;
          }
          
          if (typeof patient.maritalStatus !== 'undefined') {
            married = patient.maritalStatus.text;
          }
          
          if (typeof patient.careProvider !== 'undefined' && typeof patient.careProvider[0] !== 'undefined' ) {
            providerName = patient.careProvider[0].display;
            providerRole = patient.careProvider[0].reference;
          }
          
          //Prepare variables for index.html
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.id = id;
          p.married = married;
          p.address = address;
          p.race = race;
          p.ethnicity = ethnicity;
          p.providerName = providerName;
          p.providerRole = providerRole;
          p.height = getQuantityValueAndUnit(height[0]);
          p.weight = getQuantityValueAndUnit(weight[0]);
          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);
          p.cholesterol = getQuantityValueAndUnit(cholesterol[0]);
          p.trig = getQuantityValueAndUnit(trig[0]);

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
      id: {value: ''},
      married: {value: ''},
      address: {value: ''},
      race: {value: ''},
      ethnicity: {value: ''},
      weight: {value: ''},
      cholesterol: {value: ''},
      trig: {value: ''},
      providerName: {value: ''},
      providerRole: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#id').html(p.id);
    $('#married').html(p.married);
    $('#address').html(p.address);
    $('#race').html(p.race);
    $('#ethnicity').html(p.ethnicity);
    $('#weight').html(p.weight);
    $('#cholesterol').html(p.cholesterol);
    $('#trig').html(p.trig);
    $('#providerName').html(p.providerName);
    $('#providerRole').html(p.providerRole);
  };

})(window);

/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

// Auxiliary function to clear storage when the connection is lost

let isStorageCleared = false;

function clearStorage() {

  localStorage.clear();

  let session_table = document.getElementById('session_table');
  for (let i = session_table.rows.length - 1; i > 0; i--) {
    session_table.deleteRow(i);
  }
}

function showConnectionLostAlert() {
  Swal.fire({
    title: 'Lost connection with Application Function!',
    text: 'All session data has been purged.',
    icon: 'warning',
    confirmButtonText: 'OK'
  });
}

function checkAFstatus() {
  fetch('http://127.0.0.1:8000/connection_checker')
  .then(response => {
    if (!response.ok && !isStorageCleared) {

      document.getElementById('AFStatus').innerText = 'Connection with Application Function: ❌';
      clearStorage();
      showConnectionLostAlert();
      isStorageCleared = true;

    } else if (response.ok) {

      document.getElementById('AFStatus').innerText = 'Connection with Application Function: ✅';
      isStorageCleared = false;
    }
  })

  .catch(error => {
    console.error('Error:', error);
    if (!isStorageCleared) {
      document.getElementById('AFStatus').innerText = 'Connection with AF interrupted.';
      clearStorage();
      showConnectionLostAlert();
      isStorageCleared = true;
    }
  });
}

function addSessionToTable(sessionId) {
  const sessionData = JSON.parse(localStorage.getItem(sessionId));
  const session_table = document.getElementById('session_table');

  let row = session_table.insertRow(-1);

  let cell1 = row.insertCell(0); // Session ID
  let cell2 = row.insertCell(1); // Create CHC from JSON
  let cell3 = row.insertCell(2); // Create and show certificate
  let cell4 = row.insertCell(3); // Show Protocols button
  let cell5 = row.insertCell(4); // Consumption Reporting (Set, Show, Delete)
  let cell6 = row.insertCell(5); // Dynamic Policies
  let cell7 = row.insertCell(6); // Show Session Details
  let cell8 = row.insertCell(7); // Delete session

  cell1.innerHTML = sessionId;

  cell2.innerHTML = `<button onclick="createChcFromJson('${sessionId}')" class="btn btn-primary table-button">Create</button>`;

  cell3.innerHTML = `<button onclick="createNewCertificate('${sessionId}')" class="btn btn-primary table-button">Create</button>
                      <button onclick="showCertificateDetails('${sessionId}', '${sessionData.certificate_id}')" class="btn btn-warning table-button">Show</button>`

  cell4.innerHTML = `<button onclick="getProtocols('${sessionId}')" class="btn btn-info table-button">Show</button>`;

  cell5.innerHTML = `<button onclick="setConsumptionReporting('${sessionId}')" class="btn btn-primary table-button">Set</button>
                      <button onclick="showConsumptionReporting('${sessionId}')" class="btn btn-info table-button">Show</button>
                      <button onclick="deleteConsumptionReporting('${sessionId}')" class="btn btn-danger table-button">Delete</button>`;

  cell6.innerHTML = `<button onclick="setDynamicPolicy('${sessionId}')" class="btn btn-primary table-button">Set</button>
                    <button onclick="showDynamicPolicies('${sessionId}', '${sessionData.policy_template_id}')" class="btn btn-info table-button">Show</button>
                    <button onclick="deleteDynamicPolicy('${sessionId}', '${sessionData.policy_template_id}')" class="btn btn-danger table-button">Delete</button>`;

  cell7.innerHTML = `<button onclick="getProvisioningSessionDetails()" class="btn btn-info table-button">Show</button>`;

  cell8.innerHTML = `<button onclick="deleteProvisioningSession('${sessionId}')" class="btn btn-danger table-button">Remove</button>`;

}

async function createNewSession() {
  const response = await fetch('/create_session', { method: 'POST' });

  if (!response.ok) {
    Swal.fire({
      title: 'Application Provider says:',
      text: 'Failed to create new session. Make sure that AF is running!',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  const data = await response.json();
  Swal.fire({
    title: 'Application Provider says:',
    text: `Created provisioning session with the ID: ${data.provisioning_session_id}`,
    icon: 'success',
    confirmButtonText: 'OK'
  });

  localStorage.setItem(data.provisioning_session_id, JSON.stringify({
    certificate_id: 'not yet created'
  }));

  addSessionToTable(data.provisioning_session_id);
}

function removeSessionFromTableAndStorage(provisioning_session_id) {
  let session_table = document.getElementById('session_table');
  for (let i = 1; i < session_table.rows.length; i++) {
    if (session_table.rows[i].cells[0].innerHTML === provisioning_session_id) {
      session_table.deleteRow(i);
      break;
    }
  }
  localStorage.removeItem(provisioning_session_id);
  localStorage.removeItem(provisioning_session_id + "-cert");
}

async function deleteProvisioningSession(provisioning_session_id) {
  const result = await Swal.fire({
    title: 'Delete Provisioning Session?',
    text: "Are you sure? You won't be able to revert this.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  });

  if (result.value) {
    const response = await fetch(`/delete_session/${provisioning_session_id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      if (response.status === 404) {
        removeSessionFromTableAndStorage(provisioning_session_id);
      } else {
        Swal.fire({
          title: 'Application Provider says:',
          text: 'Failed to delete the provisioning session.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
      return;
    }

    Swal.fire({
      title: 'Application Provider says:',
      text: `Provisioning session ${provisioning_session_id} deleted with all resources`,
      icon: 'success',
      confirmButtonText: 'OK'
    });

    removeSessionFromTableAndStorage(provisioning_session_id);
  }
}

async function createChcFromJson(provisioning_session_id) {
  const response = await fetch(`/set_stream/${provisioning_session_id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    Swal.fire({
      title: 'Application Provider says:',
      text: 'Failed to set hosting for the provisioning session.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }
  
  const data = await response.json();
  Swal.fire({
    title: 'Application Provider says:',
    text: data.message,
    icon: 'success',
    confirmButtonText: 'OK'
  });
}

function getProvisioningSessionDetails() {
  window.open('http://127.0.0.1:8000/details', '_blank');
}

async function createNewCertificate(provisioning_session_id) {
  try {
      const response = await fetch(`/certificate/${provisioning_session_id}`, {
          method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {

        // Storing response data (certificate_id) to the local storage
        let session_data = JSON.parse(localStorage.getItem(provisioning_session_id)) || {};
        session_data.certificate_id = data.certificate_id;
        localStorage.setItem(provisioning_session_id, JSON.stringify(session_data));

          Swal.fire({
              title: 'All set!',
              text: `Certificate created successfully with ID: ${data.certificate_id}`,
              icon: 'success',
              confirmButtonText: 'OK'
          }); 

          let session_table = document.getElementById('session_table');

          for (let i = 1; i < session_table.rows.length; i++) {
            if (session_table.rows[i].cells[0].innerHTML === provisioning_session_id) {
                let cell = session_table.rows[i].cells[2];
                cell.innerHTML = `<button onclick="createNewCertificate('${provisioning_session_id}')" class="btn btn-primary table-button">Create</button>
                                  <button onclick="showCertificateDetails('${provisioning_session_id}', '${data.certificate_id}')" class="btn btn-warning table-button">Show</button>`;
            }
        }

      } else {
          Swal.fire({
              title: 'Error',
              text: data.detail || 'An error occurred',
              icon: 'error',
              confirmButtonText: 'OK'
          });
      }
  } catch (error) {
      Swal.fire({
          title: 'Network Error',
          text: 'Failed to communicate with the server',
          icon: 'error',
          confirmButtonText: 'OK'
      });
  }
}

function showCertificateDetails(provisioning_session_id) {
  let session_data = JSON.parse(localStorage.getItem(provisioning_session_id));
  let certificate_id = session_data.certificate_id;
  window.open(`http://127.0.0.1:8000/show_certificate/${provisioning_session_id}/${certificate_id}`, '_blank');l
}


function getProtocols(provisioning_session_id) {
  window.open(`http://127.0.0.1:8000/show_protocol/${provisioning_session_id}`, '_blank');
}


async function setConsumptionReporting(session_id) {
  const { value: formValues, dismiss } = await Swal.fire({
    title: 'Set consumption reporting parameters:',
    html:
      '<input id="swal-input1" class="swal2-input" type="number" placeholder="Reporting Interval">' +
      '<input id="swal-input2" class="swal2-input" type="number" placeholder="Sample Percentage"><br>' +
      '<br><label for="swal-input3">Location Reporting: </label>' +
      '<br><select id="swal-input3" class="swal2-input">' +
        '<option value="true">True</option>' +
        '<option value="false">False</option>' +
      '</select>' +
      '<br><br><label for="swal-input4">Access Reporting: </label><br>' +
      '<select id="swal-input4" class="swal2-input">' +
        '<option value="true">True</option>' +
        '<option value="false">False</option>' +
      '</select>',
    customClass:{
      popup: 'consumption-swall'
    },
    focusConfirm: false,
    showCancelButton: true,
    preConfirm: () => {
      let reportingInterval = document.getElementById('swal-input1').value;
      let samplePercentage = document.getElementById('swal-input2').value;

      // Errors checking
      if (!reportingInterval || !samplePercentage || isNaN(reportingInterval) || isNaN(samplePercentage)) {
        Swal.showValidationMessage("Set all parameters with valid numerical values!");
        return false;
      }

      if (samplePercentage < 0 || samplePercentage > 100) {
        Swal.showValidationMessage("Sample percentage must be between 0 and 100 %");
        return false;
      }

      return {
        reportingInterval: parseInt(reportingInterval),
        samplePercentage: parseFloat(samplePercentage),
        locationReporting: document.getElementById('swal-input3').value === 'true',
        accessReporting: document.getElementById('swal-input4').value === 'true'
      };
    }
  });

  if (formValues && !dismiss) {
    const payload = {
      reportingInterval: parseInt(formValues.reportingInterval, 10),
      samplePercentage: formValues.samplePercentage,
      locationReporting: formValues.locationReporting,
      accessReporting: formValues.accessReporting
    };

    const response = await fetch(`/set_consumption/${session_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      Swal.fire({
        title: 'Error',
        text: errorData.detail || 'An error occurred while setting consumption parameters.',
        icon: 'error'
      });
      return;
    }

    const data = await response.json();
    Swal.fire({
      title: data.message,
      icon: 'success'
    });
  }
}

async function showConsumptionReporting(provisioning_session_id){
  const url = `http://127.0.0.1:8000/show_consumption/${provisioning_session_id}`;
  window.open(url, '_blank');
}

async function deleteConsumptionReporting(session_id) {
  const result = await Swal.fire({
    title: 'Delete Consumption Reporting?',
    text: "Are you sure? You won't be able to revert this.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  });

  if (result.isConfirmed) {
    try {
      const response = await fetch(`/del_consumption/${session_id}`, {
        method: 'DELETE'
      });

      if (response.status === 204) {
        await Swal.fire({
          title: 'Deleted!',
          text: 'The consumption reporting has been deleted.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      } else {
    
        let data;
        try {
          data = await response.json();
        } catch (error) {
          data = { detail: "Unknown error occurred." };
        }

        await Swal.fire({
          title: 'Application Provider says:',
          text: data.detail,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    } catch (error) {

      await Swal.fire({
        title: 'Error',
        text: 'Network error or server not responding.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
}

async function setDynamicPolicy(session_id) {

  const { value: formValues, dismiss } = await Swal.fire({
    title: 'Create Dynamic Policy',
    html: 
    `
    <input id="externalReference" class="swal2-input" type="number" placeholder="External Policy ID" required>
    
    <br><br><p>Application Session Context:</p>
      <input id="sst" class="swal2-input" type="number" placeholder="SST">
      <input id="sd" class="swal2-input" placeholder="SD">
      <input id="dnn" class="swal2-input" placeholder="DNN">

      <br><br><p font-weight="bold">QoS Specification:</p>
      <input id="qosReference" class="swal2-input" placeholder="QoS Reference"><br>
      <br><input id="maxAuthBtrUl" class="swal2-input" type="number" placeholder="Max Auth Btr Ul">
      <select id="maxAuthBtrUlUnit" class="swal2-input">
        <option value="bps">Bps</option>
        <option value="kbps">Kbps</option>
        <option value="mbps">Mbps</option>
        <option value="gbps">Gbps</option>
        <option value="tbps">Tbps</option>
      </select>
      <br><input id="maxAuthBtrDl" class="swal2-input" type="number" placeholder="Max Auth Btr Dl">
      <select id="maxAuthBtrDlUnit" class="swal2-input">
        <option value="bps">Bps</option>
        <option value="kbps">Kbps</option>
        <option value="mbps">Mbps</option>
        <option value="gbps">Gbps</option>
        <option value="tbps">Tbps</option>
      </select>
      <br>
      <input id="defPacketLossRateDl" class="swal2-input" placeholder="Def Packet Loss Rate Dl">
      <input id="defPacketLossRateUl" class="swal2-input" placeholder="Def Packet Loss Rate Ul">

      <br><br><p>Charging Specification</p>
      <input id="sponId" class="swal2-input" placeholder="Sponsor ID">
      <input id="sponStatus" class="swal2-input" placeholder="Sponsor Status">
      <input id="gpsi" class="swal2-input" placeholder="GPSI">


      <input id="state" class="swal2-input" placeholder="State">
      <input id="type" class="swal2-input" placeholder="Type">
    `,
  customClass:{
    popup: 'policies-swall'
  },

    focusConfirm: false,
    preConfirm: () => {
      const externalReference = document.getElementById('externalReference').value;
      if (!externalReference) {
        Swal.showValidationMessage('External Policy ID is required');
        return false;
      }

      const capitalizeUnit = (unit) => {
        switch (unit.toLowerCase()) {
          case "bps":
            return "bps";
          case "kbps":
            return "Kbps";
          case "mbps":
            return "Mbps";
          case "gbps":
            return "Gbps";
          case "tbps":
            return "Tbps";
          default:
            return unit;
        }
      };

      const policyData = {
        externalReference: externalReference,
        applicationSessionContext: {
          sliceInfo: {
            sst: document.getElementById('sst').value ? parseInt(document.getElementById('sst').value) : undefined,
            sd: document.getElementById('sd').value
          },
          dnn: document.getElementById('dnn').value
        },
        qoSSpecification: {
          qosReference: document.getElementById('qosReference').value,
          maxAuthBtrUl: document.getElementById('maxAuthBtrUl').value ? `${document.getElementById('maxAuthBtrUl').value} ${capitalizeUnit(document.getElementById('maxAuthBtrUlUnit').value)}` : undefined,
          maxAuthBtrDl: document.getElementById('maxAuthBtrDl').value ? `${document.getElementById('maxAuthBtrDl').value} ${capitalizeUnit(document.getElementById('maxAuthBtrDlUnit').value)}` : undefined,
          defPacketLossRateDl: document.getElementById('defPacketLossRateDl').value ? parseInt(document.getElementById('defPacketLossRateDl').value) : undefined,
          defPacketLossRateUl: document.getElementById('defPacketLossRateUl').value ? parseInt(document.getElementById('defPacketLossRateUl').value) : undefined
        },
        chargingSpecification: {
          sponId: document.getElementById('sponId').value,
          sponStatus: document.getElementById('sponStatus').value,
          gpsi: document.getElementById('gpsi').value ? document.getElementById('gpsi').value.split(',').map(item => item.trim()) : []
        },
        state: document.getElementById('state').value,
        stateReason: {
          type: document.getElementById('type').value
        }
      };
    
      console.log("Formatted maxAuthBtrUl:", policyData.qoSSpecification.maxAuthBtrUl);
      console.log("Formatted maxAuthBtrDl:", policyData.qoSSpecification.maxAuthBtrDl);

      const cleanPolicyData = JSON.parse(JSON.stringify(policyData, (key, value) => (value === "" || value === undefined) ? undefined : value));
    
      return cleanPolicyData;
    },
    showCancelButton: true,
  });

  if (formValues) {
    try {
      const response = await fetch(`/create_policy_template/${session_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formValues)
      });

      if (!response.ok) {
        const errorData = await response.json();
        Swal.fire('Error', errorData.detail || 'An error occurred while creating the policy template.', 'error');
        return;
      }

      const data = await response.json();
      localStorage.setItem(`policyTemplateId_${session_id}`, data.policy_template_id);

      Swal.fire('Success', `Created Dynamic Policies with ID: "${data.policy_template_id}"`, 'success');
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'An unexpected error occurred.', 'error');
    }
  }
}

async function showDynamicPolicies(provisioning_session_id) {

  const policy_template_id = localStorage.getItem(`policyTemplateId_${provisioning_session_id}`);
  if (policy_template_id && policy_template_id !== 'undefined') {
      const url = `http://127.0.0.1:8000/show_policy_template/${provisioning_session_id}/${policy_template_id}`;
      window.open(url, '_blank');
  } else {
      Swal.fire({
        title: 'Error',
        text: 'Policy template ID not found or not created yet.',
        icon: 'error'
      });
  }
}

async function deleteDynamicPolicy(provisioning_session_id) {
  const policyTemplateId = localStorage.getItem(`policyTemplateId_${provisioning_session_id}`);

  if (!policyTemplateId || policyTemplateId === 'undefined') {
    await Swal.fire({
      title: 'Error',
      text: 'Policy template ID not found or not created yet.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  const result = await Swal.fire({
    title: 'Delete Policy Template?',
    text: `Are you sure you want to delete the policy template with ID: ${policyTemplateId}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
  });

  if (result.isConfirmed) {
    try {
      const response = await fetch(`/delete_policy_template/${provisioning_session_id}/${policyTemplateId}`, {
        method: 'DELETE'
      });

      if (response.status === 204) {

        await Swal.fire({
          title: 'Deleted!',
          text: `The policy template with ID: ${policyTemplateId} has been deleted.`,
          icon: 'success',
          confirmButtonText: 'OK'
        });


        localStorage.removeItem(`policyTemplateId_${provisioning_session_id}`);
      } else {
        let data;
        try {
          data = await response.json();
        } catch (error) {
          data = { detail: "Unknown error occurred." };
        }


        await Swal.fire({
          title: 'Failed to Delete',
          text: data.detail,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    } catch (error) {

      await Swal.fire({
        title: 'Error',
        text: 'Network error or server not responding.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
}

window.onload = function() {
  
  setInterval(checkAFstatus, 5000);

  let session_table = document.getElementById('session_table');
  for (let i = 0; i < localStorage.length; i++) {
    let session_id = localStorage.key(i);
    let session_data = JSON.parse(localStorage.getItem(session_id));
    let row = session_table.insertRow(-1);

    let cell1 = row.insertCell(0); // Session ID
    let cell2 = row.insertCell(1); // Create CHC from JSON
    let cell3 = row.insertCell(2); // Create and show certificate
    let cell4 = row.insertCell(3); // Show Protocols button
    let cell5 = row.insertCell(4); // Consumption Reporting (Set, Show, Delete)
    let cell6 = row.insertCell(5); // Dynamic Policies
    let cell7 = row.insertCell(6); // Show Session Details
    let cell8 = row.insertCell(7); // Delete session

    cell1.innerHTML = session_id;

    cell2.innerHTML = `<button onclick="createChcFromJson('${session_id}')" class="btn btn-primary table-button">Create</button>`;

    cell3.innerHTML = `<button onclick="createNewCertificate('${session_id}')" class="btn btn-primary table-button">Create</button>
                        <button onclick="showCertificateDetails('${session_id}', '${session_data ? session_data.certificate_id : ''}')" class="btn btn-warning table-button">Show</button>`;

    cell4.innerHTML = `<button onclick="getProtocols('${session_id}')" class="btn btn-info table-button">Show</button>`;

    cell5.innerHTML = `<button onclick="setConsumptionReporting('${session_id}')" class="btn btn-primary table-button">Set</button>
                        <button onclick="showConsumptionReporting('${session_id}')" class="btn btn-info table-button">Show</button>
                        <button onclick="deleteConsumptionReporting('${session_id}')" class="btn btn-danger table-button">Delete</button>`;

    cell6.innerHTML = `<button onclick="setDynamicPolicy('${session_id}')" class="btn btn-primary table-button">Set</button>
                        <button onclick="showDynamicPolicies('${session_id}', '${session_data ? session_data.policy_template_id : ''}')" class="btn btn-info table-button">Show</button>
                        <button onclick="deleteDynamicPolicy('${session_id}', '${session_data ? session_data.policy_template_id : ''}')" class="btn btn-danger table-button">Delete</button>`;

    cell7.innerHTML = `<button onclick="getProvisioningSessionDetails()" class="btn btn-info table-button">Show</button>`;

    cell8.innerHTML = `<button onclick="deleteProvisioningSession('${session_id}')" class="btn btn-danger table-button">Remove</button>`;
  }
}

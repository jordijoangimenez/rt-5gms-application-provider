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

      document.getElementById('AFStatus').innerText = 'Connection with Application Function has been lost ❌';
      clearStorage();
      showConnectionLostAlert();
      isStorageCleared = true;

    } else if (response.ok) {

      document.getElementById('AFStatus').innerText = 'Connection with Application Function is stable ✅';
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
  let cell2 = row.insertCell(1); // Delete session
  let cell3 = row.insertCell(2); // Create CHC from JSON
  let cell4 = row.insertCell(3); // Show Session Details
  let cell5 = row.insertCell(4); // Create and show certificate
  let cell6 = row.insertCell(5); // Show Protocols button
  let cell7 = row.insertCell(6); // Consumption Reporting (Set, Show, Delete)
  let cell8 = row.insertCell(7); // Dynamic Policies

  cell1.innerHTML = sessionId;

  cell2.innerHTML = `<button onclick="deleteProvisioningSession('${sessionId}')" class="btn btn-danger table-button">Delete</button>`;

  cell3.innerHTML = `<button onclick="createChcFromJson('${sessionId}')" class="btn btn-primary table-button">Create</button>`;

  cell4.innerHTML = `<button onclick="getProvisioningSessionDetails()" class="btn btn-info table-button">Show</button>`;

  cell5.innerHTML = `<button onclick="createNewCertificate('${sessionId}')" class="btn btn-primary table-button">Create</button>
                     <button onclick="showCertificateDetails('${sessionId}', '${sessionData.certificate_id}')" class="btn btn-warning table-button">Show</button>`;

  cell6.innerHTML = `<button onclick="getProtocols('${sessionId}')" class="btn btn-info table-button">Show</button>`;

  cell7.innerHTML = `<button onclick="setConsumptionReporting('${sessionId}')" class="btn btn-primary table-button">Set</button>
                      <button onclick="showConsumptionReporting('${sessionId}')" class="btn btn-info table-button">Show</button>
                      <button onclick="deleteConsumptionReporting('${sessionId}')" class="btn btn-danger table-button">Delete</button>`;
                      
  cell8.innerHTML = `
                    <button onclick="setDynamicPolicy('${sessionId}')" class="btn btn-primary table-button">Set</button>
                    <button onclick="showDynamicPolicies('${sessionId}', '${sessionData.policy_template_id}')" class="btn btn-info table-button">Show</button`;
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
                let cell = session_table.rows[i].cells[4];
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
  const { value: externalPolicyId } = await Swal.fire({
    title: 'Enter External Policy ID',
    input: 'text',
    inputPlaceholder: 'External Policy ID',
    showCancelButton: true,
    confirmButtonText: 'Submit',
    showLoaderOnConfirm: true,
    preConfirm: (externalPolicyId) => {
      if (!externalPolicyId) {
        Swal.showValidationMessage(`Please enter an external policy ID`);
        return false;
      }
      return externalPolicyId;
    },
    allowOutsideClick: () => !Swal.isLoading()
  });

  if (externalPolicyId) {
    try {
      const response = await fetch(`/create_policy_template/${session_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ external_policy_id: externalPolicyId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        Swal.fire({
          title: 'Error',
          text: errorData.detail || 'An error occurred while creating the policy template.',
          icon: 'error'
        });
      } else {
        const data = await response.json();
        localStorage.setItem(`policyTemplateId_${session_id}`, data.policy_template_id);

        Swal.fire({
          title: 'Success',
          text: `Created Dynamic Policies with an ID: "${data.policy_template_id}"`,
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        title: 'Error',
        text: 'An unexpected error occurred.',
        icon: 'error'
      });
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



window.onload = function() {

  setInterval(checkAFstatus, 5000);

  let session_table = document.getElementById('session_table');
  for (let i = 0; i < localStorage.length; i++) {
    let session_id = localStorage.key(i);
    let session_data = JSON.parse(localStorage.getItem(session_id));
    let row = session_table.insertRow(-1);

    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    let cell3 = row.insertCell(2);
    let cell4 = row.insertCell(3);
    let cell5 = row.insertCell(4);
    let cell6 = row.insertCell(5);
    let cell7 = row.insertCell(6);
    let cell8 = row.insertCell(7);

    cell1.innerHTML = session_id;

    cell2.innerHTML = `<button onclick="deleteProvisioningSession('${session_id}')" class="btn btn-danger table-button">Delete</button>`;

    cell3.innerHTML = `<button onclick="createChcFromJson('${session_id}')" class="btn btn-primary table-button">Create</button>`;

    cell4.innerHTML = `<button onclick="getProvisioningSessionDetails()" class="btn btn-info table-button">Show</button>`;

    cell5.innerHTML = `
            <button onclick="createNewCertificate('${session_id}')" class="btn btn-primary table-button">Create</button>
            <button onclick="showCertificateDetails('${session_id}', '${session_data ? session_data.certificate_id : ''}')" class="btn btn-warning table-button">Show</button>`;

    cell6.innerHTML = `<button onclick="getProtocols('${session_id}')" class="btn btn-info table-button">Show</button>`;

    cell7.innerHTML = `
        <button onclick="setConsumptionReporting('${session_id}')" class="btn btn-primary table-button">Set</button>
        <button onclick="showConsumptionReporting('${session_id}')" class="btn btn-info table-button">Show</button>
        <button onclick="deleteConsumptionReporting('${session_id}')" class="btn btn-danger table-button">Delete</button>`;
    
    
    cell8.innerHTML = `
        <button onclick="setDynamicPolicy('${session_id}')" class="btn btn-primary table-button">Set</button>
        <button onclick="showDynamicPolicies('${session_id}', '${session_data ? session_data.policy_template_id : ''}')" class="btn btn-info table-button">Show</button>`;

      }
}
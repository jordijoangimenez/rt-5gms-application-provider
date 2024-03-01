#!/bin/bash

# Application Function as one process
/rt-5gms-application-function/install/bin/open5gs-msafd  &
#/rt-5gms-application-function/install/bin/open5gs-msafd -c local-msaf.yaml

# FastAPI server as second process
uvicorn server:app --reload --host 0.0.0.0 --port 8000

# FIELDS

-- Job ID
Sequential numerical integers. Used for debugging. Errors are recorded with the Job ID, host, and port.

-- Type
Used to identify the job so the appropriate worker can operate on it. Period delineated words give context and structure to jobs, allowing them to be grouped for easier debugging and identification.

-- Worker
The host name of the system which last attempted to execute the job. This is useful for debugging in a disttibuted system.

-- Date Created

-- Date Updated
This field is used to identify the time of the last status change.

-- Max Attempts
The maximum number of attempts allowed before a job is marked as failed and no longer allowed to be picked up by workers.

-- Attempts
Records the number of times workers have attempted to process a job.

-- Payload
This field contains meta data necessary for a job to be processed. Meta data is stored as serialized json. Only the minimum data required to perform a job should be included. These are typically primary keys used to access records in another data store.

-- Status
Used to indicate the current status of a job. Possible states are: scheduled, queued, processing, failed, and completed.

-- TTL
This is the maximum Time To Live of a job. Jobs exceeding this time frame will be terminated early, an attempt recorded, and rescheduled or marked as failed.

-- Keep Alive
This is a date field that is used to indicate that a job is still being processed. If a job has not updated this field in over 2 hours, it's assumed that the host has hung or restarted, an attempt is logged, and the job is rescheduled or marked as failed.

-- Scheduling Algorithm
This dictates the algorithm to be used for requeue scheduling. Possible algorithms include exponential,  linear, and custom (implementation yet to be determined).

-- Requeue After
This field represents the date/time after which a job should be requeued. This is determined by the scheduling algorithm.
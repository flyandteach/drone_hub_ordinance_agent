import streamlit as st

st.set_page_config(
    page_title="Drone Hub Ordinance Agent",
    page_icon="🛫",
    layout="centered"
)

st.title("Drone Hub / Vertiport Ordinance Agent")

st.write(
    "Classify a proposed facility and generate a basic planning recommendation."
)

site_area = st.number_input(
    "Site area in square feet",
    min_value=0,
    value=25000
)

flights_per_hour = st.number_input(
    "Estimated flights per hour",
    min_value=0,
    value=20
)

passenger_service = st.selectbox(
    "Passenger service?",
    ["No", "Yes"]
)

maintenance = st.selectbox(
    "Aircraft maintenance?",
    ["No", "Yes"]
)

night_operations = st.selectbox(
    "Night operations?",
    ["No", "Yes"]
)

if st.button("Classify Facility"):

    tier = "Tier 1: Small / Low-Impact Facility"

    if (
        site_area > 20000
        or flights_per_hour > 100
        or passenger_service == "Yes"
        or maintenance == "Yes"
    ):
        tier = "Tier 3: Major-Impact Facility"

    elif (
        site_area >= 5000
        or flights_per_hour >= 10
        or night_operations == "Yes"
    ):
        tier = "Tier 2: Moderate-Impact Facility"

    st.subheader("Classification Result")

    st.success(tier)

    if "Tier 1" in tier:

        st.info(
            "Recommended: Administrative review and basic operational standards."
        )

    elif "Tier 2" in tier:

        st.warning(
            "Recommended: Conditional or special use review with operational planning requirements."
        )

    elif "Tier 3" in tier:

        st.error(
            "Recommended: Major review process including compatibility assessment, emergency planning, and public hearing."
        )
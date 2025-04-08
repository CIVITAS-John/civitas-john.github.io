---
title: "NetLogo AR (2023-Present)"
excerpt: "NetLogo AR is a spatial AR authoring toolkit that combines room-scale AR technology with NetLogo, a popular agent-based programming language. Part of Turtle Universe, the mobile version of NetLogo, it allows users to create simulations that blend digital content with real-world environments. Built on NetLogo's strengths for research and education, it enables users to model complex systems, fostering creativity in applications like games and art, making it ideal for K-12 learners and researchers.<br/><br/><img src='/images/netlogo-ar/modalities.png' width='800'>"
collection: portfolio
---

In early 2023, I designed and studied NetLogo AR, a spatial augmented reality (AR) authoring toolkit that integrates room-scale AR technology with Agent-based Modeling. My responsibilities include:
- Led a technical and research team with 4 undergraduate and graduate students to design the first room-scale AR authoring system integrated with computational thinking ideas.
– Facilitated an 8-week after-school co-design activity with a diverse cohort of elementary school students.
– Conducted video analysis to reveal children’s spatial thinking engagement and provided design suggestions (CHI 2024).

NetLogo AR is freely distributed as a part of [Turtle Universe](/portfolio/turtle-universe/), the mobile version of NetLogo. NetLogo is an agent-based programming language widely used in scientific research and education. It enables the creation of room-scale multi-agent models, simulations, artworks, or games with existing NetLogo grammar. It also enables the seamless blending of existing NetLogo models into the physical world around you.
The following figure demonstrates a sample transition included in this repository:

<img src="https://github.com/NetLogo-Mobile/NetLogo-AR/assets/12299703/a81825d8-165f-426e-8445-df0b270044da" alt="NetLogo AR Preview" width="480"/>

The following video provides a quick overview of the technical system:

[![NetLogo AR Video](https://img.youtube.com/vi/xJcEGpp6rCE/0.jpg)](https://www.youtube.com/watch?v=xJcEGpp6rCE)

### Supported Modalities
NetLogo AR currently supports three modalities:
![Comparison between NetLogo AR's modalities.](/images/netlogo-ar/modalities.png)

* **Room-scale AR**: In this modality, NetLogo AR will attempt to recognize your physical surroundings (e.g., walls, doors, tables, chairs) at a room-scale. By default, it will attempt to visualize the physical items as semi-translucent boxes. They will also be mapped to the model as polygons or lines that can interact with NetLogo agents.
* **Plane-based AR**: In this modality, NetLogo AR will attempt to recognize planes in your physical surroundings (e.g., walls, floors, tables) as polygons. The outline of the polygon will also be mapped to the model as lines that can interact with NetLogo agents.
* **Non-AR**: In this modality, since the device cannot acquire information directly from the physical surroundings, NetLogo AR supports loading from an existing save. A save can be exported from a supported device (e.g. a LIDAR-equipped iPad or iPhone). Turtle Universe also embeds a scan that will be loaded by default.

For more documentation, check out our [GitHub repository](https://github.com/NetLogo-Mobile/NetLogo-AR). If you have any questions or need technical support, please send your thoughts to [NetLogo's Official Forum](https://community.netlogo.org/). If you find any bugs when using the system, please [raise an issue here](https://github.com/NetLogo-Mobile/NetLogo-AR/issues).

## Related Publications
- Chen, J., Horn, M., & Wilensky, U. (2023, June). NetLogo AR: Bringing Room-Scale Real-World Environments Into Computational Modeling for Children. In Proceedings of the 22nd Annual ACM Interaction Design and Children Conference (pp. 736-739).
- Chen, J., Zhao, L., Li, Y., Xie, Z., Wilensky, U., & Horn, M. (2024, May). [“Oh My God! It’s Recreating Our Room!” Understanding Children’s Experiences with A Room-Scale Augmented Reality Authoring Toolkit.](/publications/2024-ar/) In Proceedings of the CHI Conference on Human Factors in Computing Systems (pp. 1-17).

## Related Projects
- [Turtle Universe](/portfolio/turtle-universe/)
- [NetLogo Chat](/portfolio/netlogo-chat/)
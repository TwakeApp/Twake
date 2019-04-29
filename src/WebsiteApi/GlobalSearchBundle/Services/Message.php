<?php

namespace WebsiteApi\GlobalSearchBundle\Services;

use WebsiteApi\GlobalSearchBundle\Entity\Bloc;

class Message

{
    private $doctrine;

    public function __construct($doctrine)
    {
        $this->doctrine = $doctrine;
    }

    public function AddMessage($message,$workspace_id,$channel_id = null){
        $blocs = $this->doctrine->getRepository("TwakeGlobalSearchBundle:Bloc")->findOneBy(Array("workspace_id"=>$workspace_id,"channel_id"=>$channel_id));
        $blocs->addmessage($message);
        //var_dump($blocs->getContentKeywords());
    }
    public function TestMessage()
    {
        //$message= Array("Salut ca va ?", "Oui et toi", "mouais ca va mais j'ai faim", "Viens on va manger", "J'ai pas de sous", "Je paye", "c'est cool", "Tacos", "Ca marche");
//        $bloc = Array("Cinquante et deux dix",
//            "Les Romains c'est l'avenir",
//            "Ça serait pas plutôt cinquante et dix et dix pour les romains ?",
//            "@bombidabiere tetais chaud pour aller voir endgame ce soir? D'ailleurs s'il y en a d'autres manifestez vous",
//            "J y vais demain normalement",
//            "ouais nous on a réservé les places pour la séance de 20h en vo à l'ugc et on va au tacos à 18h30",
//            "Bon j'ai besoin de l'indexation de masse de message je vais prendre les messages d'ici pour me faire un jeu de test",
//            "vous pouvez faire coucou si vous voulez",
//            "bon j'ai pas pris la partie sur octante mon truc doit être multi langue mais l'argot peut etre exclus"
//            );
       $message = Array("Ha attends je regarde, non c'est un plus clair ",
            "C'est le bleu #317595 on refera un choix final plus tard mais on aime bien lui en attendant pour avancer, tu as moyen de changer les couleurs rapidement pendant que le projet avance ?",
            "C'est noté! Oui sans problème les couleurs sont variables",
            "Un peu à la illustrator avec les palettes ? (j'avais cherché sans succès pendant ma courte période d'utilisation de Sketch...)",
            "C'est ça en gros les couleurs, shadows, gradients et font peuvent être définis dans des \"layer style\" et \"text style\" qui sont donc variables facilement. Pour les font c'est un peu plus long à setter mais pour les couleurs c'est très simple",
            "C'est génial ça, merci de l'info je regarderai, je trouvais que ça manquait cruellement !",
            "C'est sympathique comme début ! La recherche me semble très grande, je pense qu'on pourrait mettre des boutons à côté de la recherche pour accéder à l'édition de la chaîne en cours (membres, nom, ce qu'on trouve actuellement dans les \"...\" au hover du channel).
            En ce qui concerne les barres du bas, pour l'instant je ne sais pas, par contre on sera obligé de mettre les icônes d'applications comme actuellement (pour les smileys, les appels, les gifs et les autres intégrations)
            Ensuite il y a les onglets, je n'ai pas de problème avec eux, mais ils me font penser à deux choses :
            - déjà on a un cas ou on peut avoir deux fois une même application dans les onglets, par exemple j'attaches deux dossiers dans la chaîne et ça fais deux onglets avec la même icône, actuellement on groupe les onglets par application afin de n'afficher l'icone qu'une fois à gauche des onglets correspondant
            - ensuite les application peuvent être développées par des tiers, ce qui fait qu'il y aura des icônes tierces utilisées possiblement. Du coup soit on met des icône plus chargées pour nos applications, soit on garde ce que tu proposes ce qui donnes l'impression que l'application est plus intégrée à la plateforme (mais d'un autre côté elle reste optionnelle aujourd'hui, il est possible de ne pas utiliser de calendrier ou de stockage sur Twake, et on retrouve ces applications dans notre marketplace d'applications)
            Encore une dernière remarque, j'ai l'impression que les 3 éléments du header (titre, type de chahnel et nombre d'user) sont trop serrées par rapport au reste (pour une fois que c'est trop serré haha !)
            Ça pourrait être sympa de s'appeler semaine prochaine pour faire un premier debrief en visio ? 🙂
            Merci pour ces retours ! je vous envoie prochainnement un créneau pour qu'on puisse s'appeler",
           "Un peu à la illustrator avec les palettes ? (j'avais cherché sans succès pendant ma courte période d'utilisation de Sketch...)",
            "On a un peu discuté avec Benoit sur différents points :
            - la recherche globale, on peut éventuellement la déplacer dans la vue principale (droite) à la manière de slack, car elle va être accessible depuis toutes les applications de toute manière, donc c'est une option possible 🙂
            - l'espacement entre le bord haut de la fenêtre et les premiers éléments des deux barres de gauche est vachement grand je trouve, bien que finalement je trouve l'espacement de 24px entre les workspaces très bien ✅ 
            - moi j'aime bien la couleur sombre du 005 mais pas Benoit qui trouve ça trop gris/noir et donc pas assez coloré, par contre on est d'accord sur le fait que la version 005 est celle qu'on préfère pour le moment (celle avec le fond gris clair), reste donc à jouer sur cette couleur sombre et voir comment on peut l'améliorer !"
        );

       $messagetest="J AI FAIM";
        //mettre a jour le bloc
        $lastbloc = $this->doctrine->getRepository("TwakeGlobalSearchBundle:Bloc")->findOneBy(Array("workspace_id" =>" 480f11b4-4747-11e9-aa8e-0242ac120005"));
        $lastbloc->AddMessage($messagetest,"480f11b4-4747-11e9-aa8e-0242ac120005","480f11b4-4747-11e9-aa8e-0242ac120005");
        $this->doctrine->persist($lastbloc);
        $this->doctrine->flush();
        $lastbloc = $this->doctrine->getRepository("TwakeGlobalSearchBundle:Bloc")->findOneBy(Array("workspace_id" =>" 480f11b4-4747-11e9-aa8e-0242ac120005"));
        //var_dump($lastbloc);

        if(count($lastbloc->getContentKeywords())> 8) {
            var_dump("PRET A INDEXER LE BLOC DE MESSAGE");
            //indexer le bloc de message
//        $options = Array(
//            "index" => "message",
//            "data" => Array(
//                "id" => "blocmessage1",
//                "workspace_id" => "workspace_1",
//                "channel_id" => "channel_1",
//                "content" => $message
//            )
//        );
            //        $this->doctrine->es_put_perso($options);
        }


//        $blocbdd= new Bloc("480f11b4-4747-11e9-aa8e-0242ac120005", "480f11b4-4747-11e9-aa8e-0242ac120005", "480f11b4-4747-11e9-aa8e-0242ac120005","480f11b4-4747-11e9-aa8e-0242ac120005",0, $message);
//        $this->doctrine->persist($blocbdd);
//        $this->doctrine->flush();


//        $this->doctrine->remove($blocs);
//        $this->doctrine->flush();
//        $this->doctrine->clear();
//        $test = $this->doctrine->getRepository("TwakeGlobalSearchBundle:Bloc")->findBy(Array());
//        var_dump(count($test));






//        $terms = Array();
//        $terms[] = Array(
//            "match_phrase" => Array(
//                "content" => "Salut ca va"
//            ));
//        $terms[] = Array(
//            "match_phrase" => Array(
//                "content" => "mouais ca va mais j'ai faim"
//            ));
//        $terms[] = Array(
//            "match_phrase" => Array(
//                "content" => "J y vais demain normalement"
//            ));
//
//        $options = Array(
//            "repository" => "TwakeGlobalSearchBundle:Bloc",
//            "index" => "message",
//            "query" => Array(
//                "bool" => Array(
//                    "should" => $terms
//                    )
//                )
//            );




        //var_dump(json_encode($options,JSON_PRETTY_PRINT));
        //$result = $this->doctrine->es_search_perso($options);
        //var_dump($result);

    }

}